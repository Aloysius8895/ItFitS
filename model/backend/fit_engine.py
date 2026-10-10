"""
Fit engine: combines the user's body measurements, the hand-entered
garment size chart and the trained ML model into one verdict per size.

Primary signal : "ease" = (garment - body) / body, per measurement.
ML nudge       : the trained model's P(large) - P(small) shifts the ease by
                 up to +/- ML_EASE_SHIFT percentage points.
"""

from statistics import mean
from typing import Optional

from backend import config
from backend.predictor import predictor


LEVELS = ["too_tight", "fitted", "relaxed", "oversize"]

LEVEL_LABELS = {
    "too_tight": "Too tight",
    "fitted": "Fitted",
    "relaxed": "Relaxed",
    "oversize": "Oversize",
}

# Review vocabulary (matches the training labels) for each verdict.
LEVEL_TO_CLASS = {
    "too_tight": "small",
    "fitted": "fit",
    "relaxed": "fit",
    "oversize": "large",
}

# Fabric stretch = how far below zero ease the garment still fits the body.
STRETCH_PCT = {"none": 0.0, "low": 3.0, "medium": 6.0, "high": 10.0}

RELAXED_FROM = 4.0     # mean ease (%) where "fitted" ends
OVERSIZE_FROM = 12.0   # mean ease (%) where "relaxed" ends

TOP_CATEGORIES = {
    "top", "shirt", "blouse", "sweater", "coat", "jacket", "blazer",
    "vest", "tank", "tunic", "cardigan", "knit", "turtleneck", "bomber",
    "parka", "poncho", "cape", "trench",
}
BOTTOM_CATEGORIES = {
    "skirt", "pants", "pant", "jeans", "trouser", "culottes", "culotte",
    "tight",
}

# Letter size -> numeric size used by the trained model's `size` feature.
LETTER_TO_NUMERIC = {
    "xxs": 0, "xs": 2, "s": 4, "m": 8, "l": 12, "xl": 16, "xxl": 20,
    "2xl": 20, "3xl": 24,
}


def relevant_measurements(category: str):
    category = category.lower().strip()

    if category in TOP_CATEGORIES:
        return ["bust", "waist"]

    if category in BOTTOM_CATEGORIES:
        return ["waist", "hip"]

    return ["bust", "waist", "hip"]


def numeric_size(label: str, explicit: Optional[float] = None) -> float:
    if explicit is not None:
        return float(explicit)

    key = label.strip().lower()

    if key in LETTER_TO_NUMERIC:
        return float(LETTER_TO_NUMERIC[key])

    try:
        return float(key)
    except ValueError:
        return 8.0


def derive_body_type(bust: float, waist: float, hip: float) -> str:
    """Map circumferences (cm) to the body types used in the dataset."""
    if hip > bust * 1.05 and hip > waist * 1.2:
        return "pear"

    if bust > hip * 1.05 and bust > waist * 1.15:
        return "full bust"

    if waist >= bust * 0.95 and waist >= hip * 0.95:
        return "apple"

    if abs(bust - hip) <= bust * 0.05 and waist <= min(bust, hip) * 0.78:
        return "hourglass"

    if waist >= min(bust, hip) * 0.9:
        return "straight & narrow"

    return "athletic"


def estimate_bust_size(bust_cm: float) -> str:
    """
    Rough band+cup string (e.g. '34c') from bust circumference.
    The dataset stores bra sizes; users only know their bust measurement,
    so this is an estimate.
    """
    bust_in = bust_cm / 2.54
    band = int(round(bust_in * 0.9 / 2.0) * 2)
    band = max(32, min(40, band))
    diff = bust_in - band

    if diff <= 1.5:
        cup = "a"
    elif diff <= 2.5:
        cup = "b"
    elif diff <= 3.5:
        cup = "c"
    elif diff <= 4.5:
        cup = "d"
    else:
        cup = "dd"

    return f"{band}{cup}"


def ml_features(body: dict, category: str, size_label: str,
                explicit_size: Optional[float]) -> dict:
    return {
        "age": float(body["age"]),
        "height_cm": float(body["height"]),
        "weight_kg": float(body["weight"]),
        "body_type": derive_body_type(body["bust"], body["waist"], body["hip"]),
        "bust_size": estimate_bust_size(body["bust"]),
        "category": category.lower().strip(),
        "size": numeric_size(size_label, explicit_size),
        # Not asked in the try-on flow; use the dataset's typical values.
        "rating": 4.0,
        "rented_for": "everyday",
    }


def classify(mean_ease: float, min_ease: float, stretch_pct: float) -> str:
    if min_ease < -stretch_pct:
        return "too_tight"

    if mean_ease < RELAXED_FROM:
        return "fitted"

    if mean_ease < OVERSIZE_FROM:
        return "relaxed"

    return "oversize"


def assess_size(body: dict, garment: dict, row: dict) -> dict:
    """Verdict for one row of the size chart."""
    keys = relevant_measurements(garment["category"])
    stretch = STRETCH_PCT.get(garment.get("stretch", "none"), 0.0)

    ease = {
        key: round((row[key] - body[key]) / body[key] * 100, 1)
        for key in keys
    }

    features = ml_features(
        body, garment["category"], row["label"], row.get("numeric_size")
    )

    ml = None
    shift = 0.0

    if predictor.pipeline is not None:
        result = predictor.predict(features)
        probs = result["probabilities"]
        signal = probs.get("large", 0.0) - probs.get("small", 0.0)
        shift = signal * config.ML_EASE_SHIFT
        ml = {
            "fit": result["fit"],
            "confidence": result["confidence"],
            "probabilities": probs,
            "ease_shift": round(shift, 1),
        }

    mean_ease = mean(ease.values()) + shift
    min_ease = min(ease.values()) + shift
    level = classify(mean_ease, min_ease, stretch)

    return {
        "size": row["label"],
        "level": level,
        "label": LEVEL_LABELS[level],
        "review_class": LEVEL_TO_CLASS[level],
        "ease_pct": ease,
        "mean_ease_pct": round(mean_ease, 1),
        "ml": ml,
        "features": features,
    }


def assess_all(body: dict, garment: dict) -> dict:
    sizes = [assess_size(body, garment, row) for row in garment["size_chart"]]

    candidates = [s for s in sizes if s["level"] != "too_tight"]
    recommended = None

    if candidates:
        recommended = min(
            candidates, key=lambda s: abs(s["mean_ease_pct"] - RELAXED_FROM)
        )["size"]

    return {
        "body_type": derive_body_type(body["bust"], body["waist"], body["hip"]),
        "measurements_used": relevant_measurements(garment["category"]),
        "recommended_size": recommended,
        "sizes": sizes,
    }
