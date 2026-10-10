"""
"Similar bodies" feedback: shoppers in the merged review data with a height and
weight close to the user, and which relative size they kept.

Platform size codes (RTR, ModCloth) are not S/M/L, so each review's size is
placed by its percentile within its platform (size_pct) and bucketed onto the
product's own size list. Only women's reviews contain body measurements, so
for any other profile this returns available=False instead of borrowing
women's data.
"""

import threading

import pandas as pd

from backend import config


DATA_PATH = config.BASE_DIR.parent / "data" / "flowfit_integrated.csv"

GROUP_TO_CATEGORIES = {
    "top": ["top"],
    "outerwear": ["outerwear"],
    "dress": ["dress", "jumpsuit"],
    "bottom": ["bottom"],
    "other": ["top", "dress", "bottom", "outerwear", "jumpsuit", "other"],
}

APP_GROUP = {
    "knitwear": "top", "shirt": "top", "top": "top", "tee": "top", "blouse": "top",
    "sweater": "top", "jacket": "outerwear", "coat": "outerwear", "outerwear": "outerwear",
    "dress": "dress", "jumpsuit": "dress", "pants": "bottom", "jeans": "bottom",
    "skirt": "bottom", "shorts": "bottom",
}

HEIGHT_TOLERANCE = 3.0   # cm
WEIGHT_TOLERANCE = 4.0   # kg
MIN_NEIGHBOURS = 30

_lock = threading.Lock()
_data = None


def _load():
    global _data

    with _lock:
        if _data is None and DATA_PATH.exists():
            frame = pd.read_csv(
                DATA_PATH,
                usecols=["source", "gender", "category", "height_cm", "weight_kg",
                         "size_pct", "fit"],
            )
            frame = frame[frame["source"].isin(["renttherunway", "modcloth"])]
            _data = frame.dropna(subset=["height_cm", "size_pct", "fit"])

    return _data


def similar_bodies(body: dict, category: str, sizes: list) -> dict:
    if body.get("sex") != "female":
        return {
            "available": False,
            "reason": "The review data with body measurements is from women only; "
                      "no similar-body feedback is shown rather than borrowing it.",
        }

    data = _load()

    if data is None:
        return {"available": False, "reason": "Review dataset not found on the server."}

    group = APP_GROUP.get(category.lower().strip(), "other")
    rows = data[data["category"].isin(GROUP_TO_CATEGORIES[group])]
    near = rows[(rows["height_cm"] - body["height"]).abs() <= HEIGHT_TOLERANCE]

    with_weight = near[(near["weight_kg"] - body["weight"]).abs() <= WEIGHT_TOLERANCE]
    matched_on = "height and weight"

    if len(with_weight) >= MIN_NEIGHBOURS:
        near = with_weight
    else:
        matched_on = "height"

    if len(near) < MIN_NEIGHBOURS:
        return {"available": False, "reason": "Too few similar bodies in the review data."}

    buckets = (near["size_pct"] * len(sizes)).clip(upper=len(sizes) - 1e-9).astype(int)
    kept = near["fit"] == "fit"

    kept_counts = buckets[kept].value_counts()
    total_kept = int(kept.sum())

    distribution = []
    for index, label in enumerate(sizes):
        in_bucket = int((buckets == index).sum())
        kept_here = int(kept_counts.get(index, 0))
        distribution.append({
            "size": label,
            "kept_pct": round(kept_here / total_kept * 100) if total_kept else 0,
            "fit_rate_pct": round(kept_here / in_bucket * 100) if in_bucket else None,
            "reviews": in_bucket,
        })

    return {
        "available": True,
        "neighbours": int(len(near)),
        "matched_on": matched_on,
        "category_group": group,
        "sizes": distribution,
        "note": "Relative size position across Rent the Runway and ModCloth reviews.",
    }
