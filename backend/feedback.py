"""
Post-purchase review loop.

Every generated try-on is stored as a prediction. A review says whether the
purchased size really was small / fit / large. When the share of pending
reviews that contradict the system's verdict reaches MISMATCH_THRESHOLD (and
at least MIN_REVIEWS are pending) the fit model retrains itself on the
original dataset plus all reviews.
"""

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.base import clone
from sklearn.model_selection import train_test_split

from backend import config
from backend.predictor import predictor, MODEL_PATH, METADATA_PATH


DATA_PATH = config.BASE_DIR / "data" / "clean" / "flowfit_clean.csv"
DB_PATH = config.FEEDBACK_DIR / "flowfit_feedback.db"

VALID_ACTUAL = {"small", "fit", "large"}

_retrain_lock = threading.Lock()


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _connect():
    config.FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS predictions (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            size TEXT,
            level TEXT,
            review_class TEXT,
            features TEXT
        );
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id TEXT UNIQUE,
            actual TEXT,
            comment TEXT,
            created_at TEXT,
            batch INTEGER
        );
    """)
    return conn


def save_prediction(features: dict, size: str, level: str,
                    review_class: str) -> str:
    prediction_id = uuid.uuid4().hex[:12]

    with _connect() as conn:
        conn.execute(
            "INSERT INTO predictions VALUES (?, ?, ?, ?, ?, ?)",
            (prediction_id, _now(), size, level, review_class,
             json.dumps(features)),
        )

    return prediction_id


def _model_version() -> int:
    return int(predictor.metadata.get("model_version", 1))


def status() -> dict:
    with _connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
        pending = conn.execute("""
            SELECT r.actual, p.review_class
            FROM reviews r JOIN predictions p ON p.id = r.prediction_id
            WHERE r.batch IS NULL
        """).fetchall()

    mismatches = sum(1 for row in pending if row["actual"] != row["review_class"])
    pending_count = len(pending)
    rate = mismatches / pending_count if pending_count else 0.0

    return {
        "model_version": _model_version(),
        "total_reviews": total,
        "pending_reviews": pending_count,
        "pending_mismatches": mismatches,
        "mismatch_rate": round(rate, 4),
        "mismatch_threshold": config.MISMATCH_THRESHOLD,
        "min_reviews": config.MIN_REVIEWS,
        "retraining": _retrain_lock.locked(),
        "history": predictor.metadata.get("fine_tuning", []),
    }


def add_review(prediction_id: str, actual: str, comment: str = "") -> dict:
    if actual not in VALID_ACTUAL:
        raise ValueError("actual must be one of: small, fit, large")

    with _connect() as conn:
        exists = conn.execute(
            "SELECT 1 FROM predictions WHERE id = ?", (prediction_id,)
        ).fetchone()

        if not exists:
            raise LookupError("Unknown prediction id.")

        try:
            conn.execute(
                "INSERT INTO reviews (prediction_id, actual, comment, created_at)"
                " VALUES (?, ?, ?, ?)",
                (prediction_id, actual, comment[:500], _now()),
            )
        except sqlite3.IntegrityError:
            raise ValueError("This purchase already has a review.")

    current = status()
    triggered = (
        current["pending_reviews"] >= config.MIN_REVIEWS
        and current["mismatch_rate"] >= config.MISMATCH_THRESHOLD
        and not current["retraining"]
    )

    if triggered:
        threading.Thread(target=retrain, daemon=True).start()
        current["retraining"] = True

    current["retrain_triggered"] = triggered
    return current


def retrain() -> dict:
    """Retrain on base data + all reviews. Safe to call from any thread."""
    if not _retrain_lock.acquire(blocking=False):
        return {"skipped": "already running"}

    try:
        return _retrain()
    finally:
        _retrain_lock.release()


def _retrain() -> dict:
    features = predictor.metadata["features"]
    target = predictor.metadata.get("target", "fit")

    base = pd.read_csv(DATA_PATH)
    X, y = base[features], base[target]

    # Same split the original model was evaluated on.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    with _connect() as conn:
        rows = conn.execute("""
            SELECT r.id AS review_id, r.actual, p.features
            FROM reviews r JOIN predictions p ON p.id = r.prediction_id
        """).fetchall()

    review_X = pd.DataFrame([json.loads(r["features"]) for r in rows])[features]
    review_y = pd.Series([r["actual"] for r in rows], name=target)

    X_new = pd.concat([X_train] + [review_X] * config.REVIEW_WEIGHT,
                      ignore_index=True)
    y_new = pd.concat([y_train] + [review_y] * config.REVIEW_WEIGHT,
                      ignore_index=True)

    old_accuracy = float((predictor.pipeline.predict(X_test) == y_test).mean())

    candidate = clone(predictor.pipeline)
    candidate.fit(X_new, y_new)
    new_accuracy = float((candidate.predict(X_test) == y_test).mean())

    version = _model_version()
    accepted = new_accuracy >= old_accuracy - config.MAX_ACCURACY_DROP

    entry = {
        "at": _now(),
        "from_version": version,
        "reviews_used": len(rows),
        "holdout_accuracy_before": round(old_accuracy, 4),
        "holdout_accuracy_after": round(new_accuracy, 4),
        "accepted": accepted,
    }

    if accepted:
        config.MODEL_VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(predictor.pipeline,
                    config.MODEL_VERSIONS_DIR / f"fit_model_v{version}.pkl")
        joblib.dump(candidate, MODEL_PATH)
        entry["to_version"] = version + 1
        predictor.metadata["model_version"] = version + 1
        predictor.pipeline = candidate

    predictor.metadata.setdefault("fine_tuning", []).append(entry)

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(predictor.metadata, f, indent=4)

    # Mark every pending review as consumed (accepted or not) so a rejected
    # run does not loop; they stay in the training set for future retrains.
    with _connect() as conn:
        conn.execute(
            "UPDATE reviews SET batch = ? WHERE batch IS NULL", (version,)
        )

    return entry
