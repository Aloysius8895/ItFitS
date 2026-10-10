"""
Per-size fit assessment for the Fitted mobile app.

Primary signal : ease = (garment - body) / body per measurement, compared with
                 the ease the user wants (fit preference + the garment's cut).
ML nudge       : the trained fit model's P(large) - P(small) shifts the ease.
                 The model was trained on women's reviews only, so it is only
                 applied when the profile's sex is "female"; for everyone else
                 the verdict comes from the size chart alone and confidence is
                 lowered. Reviews record sex so retraining can rebalance later.
"""

from statistics import mean
from typing import Optional

from backend import fit_engine
from backend.predictor import predictor


LEVEL_LABELS = {
    "too_tight": "TOO TIGHT",
    "fitted": "FITTED",
    "relaxed": "RELAXED",
    "oversize": "OVERSIZE",
}

# Ease (%) the user wants, by preference, before the garment's cut is applied.
PREFERENCE_TARGET = {"fitted": 4.0, "regular": 8.0, "relaxed": 14.0, "oversize": 24.0}

# The cut is the designer's intended ease on top of the user's preference.
CUT_SHIFT = {"slim": -3.0, "regular": 0.0, "straight": 0.0, "relaxed": 3.0, "oversized": 8.0}

# Category group -> (tight below, relaxed from, oversize from), all ease %.
# Woven tops and outerwear need more room than dresses or bottoms to move in.
THRESHOLDS = {
    "top": (3.0, 12.0, 22.0),
    "outerwear": (6.0, 16.0, 26.0),
    "other": (0.0, 4.0, 12.0),
}

CATEGORY_GROUP = {
    "top": "top", "tops": "top", "knitwear": "top", "knit": "top", "sweater": "top",
    "shirt": "top", "blouse": "top", "tee": "top", "t-shirt": "top", "tank": "top",
    "jacket": "outerwear", "coat": "outerwear", "outerwear": "outerwear",
    "blazer": "outerwear", "puffer": "outerwear",
}

# App category -> category the trained model knows.
MODEL_CATEGORY = {
    "knitwear": "sweater", "shirt": "shirt", "top": "top", "jacket": "jacket",
    "coat": "coat", "dress": "dress", "pants": "pants", "skirt": "skirt",
    "jeans": "jeans",
}

ZONES = ["chest", "waist", "hip", "shoulder", "length"]
# Garment chart field -> body field it is compared with.
BODY_KEY = {"chest": "chest", "waist": "waist", "hip": "hip", "shoulder": "shoulder"}

SCORE_SLOPE = 3.2           # fit score lost per % of ease away from the target
APP_ML_EASE_SHIFT = 4.0     # max ease shift (%) from the ML model


def category_group(category: str) -> str:
    return CATEGORY_GROUP.get(category.lower().strip(), "other")


def target_ease(preference: str, cut: str) -> float:
    return PREFERENCE_TARGET.get(preference, 8.0) + CUT_SHIFT.get(cut.lower(), 0.0)


def predicted_rating(mean_ease: float, target: float, level: str) -> int:
    """1-9 scale used by the app's review screen (5 = perfect)."""
    rating = max(1, min(9, round(5 + (mean_ease - target) / 4)))
    return min(rating, 3) if level == "too_tight" else rating


def rating_to_class(rating: int) -> str:
    if rating <= 3:
        return "small"
    if rating >= 7:
        return "large"
    return "fit"


def _ml_signal(body: dict, garment: dict, label: str) -> Optional[dict]:
    if body.get("sex") != "female" or predictor.pipeline is None:
        return None

    features = _ml_features(body, garment, label)

    try:
        result = predictor.predict(features)
    except Exception:
        return None

    probs = result["probabilities"]
    signal = probs.get("large", 0.0) - probs.get("small", 0.0)

    return {
        "fit": result["fit"],
        "confidence": result["confidence"],
        "probabilities": probs,
        "ease_shift": round(signal * APP_ML_EASE_SHIFT, 1),
    }


def _ml_features(body: dict, garment: dict, label: str) -> dict:
    legacy_body = {
        "age": body.get("age") or 30,
        "height": body["height"],
        "weight": body["weight"],
        "bust": body["chest"],
        "waist": body["waist"],
        "hip": body.get("hip") or body["waist"] * 1.25,
    }
    category = MODEL_CATEGORY.get(garment["category"].lower(), garment["category"].lower())
    return fit_engine.ml_features(legacy_body, category, label, None)


def _zone(name: str, ease_cm: float, ease_pct: float, target: float, tight_below: float) -> dict:
    if name in ("shoulder", "length"):
        # Small absolute measurements: judge in cm around a +1.5 cm ideal.
        position = 0.5 + (ease_cm - 1.5) / 16
        tight = ease_cm < -1.5
    else:
        position = 0.5 + (ease_pct - target) / 40
        tight = ease_pct < tight_below

    position = max(0.04, min(0.96, position))
    word = "TIGHT" if tight or position < 0.4 else "LOOSE" if position > 0.6 else "IDEAL"

    return {
        "name": name.upper(),
        "ease_cm": round(ease_cm, 1),
        "ease_pct": round(ease_pct, 1),
        "position": round(position, 3),
        "word": word,
        "off": word != "IDEAL",
    }


DETAILS = {
    "too_tight": "Below your body measurements; expect pulling and restricted movement.",
    "fitted": "Close to the body with little spare room.",
    "relaxed": "Comfortable room to move with the intended silhouette.",
    "oversize": "Visibly large on you; only for a deliberately oversized look.",
}


def assess_size(body: dict, garment: dict, row: dict, preference: str) -> dict:
    if is_range_row(row):
        # A range-chart verdict depends on the whole chart (the height-based size).
        sizes, _ = assess_range_chart(body, garment["size_chart"], preference)
        return next(size for size in sizes if size["size"] == row["label"])

    group = category_group(garment["category"])
    tight_below, relaxed_from, oversize_from = THRESHOLDS[group]
    stretch = fit_engine.STRETCH_PCT.get(garment.get("stretch", "none"), 0.0)
    target = target_ease(preference, garment.get("cut", "regular"))

    circumference = {}
    zones = []

    for name in ZONES:
        body_key = BODY_KEY.get(name)
        if row.get(name) is None or body_key is None or not body.get(body_key):
            continue

        ease_cm = row[name] - body[body_key]
        ease_pct = ease_cm / body[body_key] * 100

        if name != "shoulder":
            circumference[name] = ease_pct

        zones.append(_zone(name, ease_cm, ease_pct, target, tight_below - stretch))

    ml = _ml_signal(body, garment, row["label"])
    shift = ml["ease_shift"] if ml else 0.0

    mean_ease = mean(circumference.values()) + shift
    min_ease = min(circumference.values()) + shift

    if min_ease < tight_below - stretch:
        level = "too_tight"
    elif mean_ease < relaxed_from:
        level = "fitted"
    elif mean_ease < oversize_from:
        level = "relaxed"
    else:
        level = "oversize"

    score = max(5.0, min(99.0, 97 - SCORE_SLOPE * abs(mean_ease - target)))
    if level == "too_tight":
        score = min(score, 40.0)

    rating = predicted_rating(mean_ease, target, level)

    return {
        "size": row["label"],
        "level": level,
        "label": LEVEL_LABELS[level],
        "detail": DETAILS[level],
        "score": round(score),
        "ease_cm": round(row["chest"] - body["chest"], 1),
        "mean_ease_pct": round(mean_ease, 1),
        "ease_pct": {k: round(v, 1) for k, v in circumference.items()},
        "position": round(max(0.04, min(0.96, 0.5 + (mean_ease - target) / 40)), 3),
        # Same scale as range charts: +1 = at the tight limit, -1 = start of relaxed.
        "fit_index": round(1 - 2 * (mean_ease - (tight_below - stretch))
                           / (relaxed_from - (tight_below - stretch)), 2),
        "zones": zones,
        "ml": ml,
        "predicted_rating": rating,
        "review_class": rating_to_class(rating),
    }


# --- Height / weight range charts (ruler/*.csv, Taobao-style) ---------------
# The base size is chosen by HEIGHT: the size whose height range the person is
# closest to the middle of (ties go to the smaller size). Weight only marks a
# size TIGHT or LOOSE. The fit preference then moves the pick (fitted one size
# down, relaxed one up, oversize two up), never onto a size the person cannot
# wear (weight TIGHT and height SHORT together).
RANGE_PREFERENCE_STEPS = {"fitted": -1, "regular": 0, "relaxed": 1, "oversize": 2}
RANGE_SCORE_STEP = 22.0     # fit score lost per size away from the pick
RANGE_WEIGHT_SHARE = 0.6    # for fit_index only: weight drives girth, height length
# Height decides the size, but weight this far over a size's range (z, half-range
# widths; about 25 kg for L) still rules it out.
RANGE_WEIGHT_EXTREME_Z = 6.0


def is_range_row(row: dict) -> bool:
    return row.get("chest") is None and (
        row.get("height_min") is not None or row.get("weight_min") is not None
    )


def _range_zone(name: str, value: float, low: float, high: float, unit: str,
                over_word: str, under_word: str) -> tuple:
    centre, half = (low + high) / 2, max((high - low) / 2, 0.5)
    z = (value - centre) / half
    outside = value - high if value > high else value - low if value < low else 0.0
    word = over_word if z > 1 else under_word if z < -1 else "IDEAL"
    span = f"{low:g}–{high:g} {unit}"
    display = (f"IN RANGE {span}" if outside == 0
               else f"{outside:+.1f} {unit} vs {span}")

    return z, {
        "name": name,
        "ease_cm": round(outside, 1),
        "ease_pct": round(z, 2),
        "position": round(max(0.04, min(0.96, 0.5 - 0.1 * z)), 3),
        "word": word,
        "off": word != "IDEAL",
        "display": display,
    }


def _range_zones(body: dict, row: dict) -> dict:
    """z (half-range widths from the middle; -1..1 = inside) and zone per measurement."""
    out = {}
    if row.get("weight_min") is not None:
        out["WEIGHT"] = _range_zone("WEIGHT", body["weight"], row["weight_min"],
                                    row["weight_max"], "KG", "TIGHT", "LOOSE")
    if row.get("height_min") is not None:
        out["HEIGHT"] = _range_zone("HEIGHT", body["height"], row["height_min"],
                                    row["height_max"], "CM", "SHORT", "LONG")
    return out


def _range_cannot_wear(zones: dict) -> bool:
    if "WEIGHT" in zones and zones["WEIGHT"][0] > RANGE_WEIGHT_EXTREME_Z:
        return True
    if "WEIGHT" in zones and "HEIGHT" in zones:
        return zones["WEIGHT"][1]["word"] == "TIGHT" and zones["HEIGHT"][1]["word"] == "SHORT"
    return next(iter(zones.values()))[0] > 1.5


def assess_range_chart(body: dict, rows: list, preference: str):
    """Verdict for every size of a height/weight chart, and the recommended size."""
    zones = [_range_zones(body, row) for row in rows]
    key = "HEIGHT" if all("HEIGHT" in z for z in zones) else "WEIGHT"
    base = min(range(len(rows)), key=lambda i: (abs(zones[i][key][0]), i))

    pick = max(0, min(len(rows) - 1, base + RANGE_PREFERENCE_STEPS.get(preference, 0)))
    while pick < len(rows) - 1 and _range_cannot_wear(zones[pick]):
        pick += 1

    sizes = [_assess_range_size(body, row, zones[i], i - base, i - pick)
             for i, row in enumerate(rows)]
    return sizes, rows[pick]["label"]


def _assess_range_size(body: dict, row: dict, zones: dict, steps: int, offset: int) -> dict:
    """steps: sizes above (+) / below (-) the height-based size; offset: from the pick."""
    parts = [(RANGE_WEIGHT_SHARE if name == "WEIGHT" else 1 - RANGE_WEIGHT_SHARE, z)
             for name, (z, _) in zones.items()]
    fit_index = sum(w * z for w, z in parts) / sum(w for w, _ in parts)

    if _range_cannot_wear(zones) or steps <= -2:
        level = "too_tight"
    elif steps <= 0:
        level = "fitted"
    elif steps == 1:
        level = "relaxed"
    else:
        level = "oversize"

    score = max(5.0, 95 - RANGE_SCORE_STEP * abs(offset))
    rating = max(1, min(9, 5 + 2 * offset))
    if level == "too_tight":
        score, rating = min(score, 40.0), min(rating, 3)

    zone_list = [zone for _, zone in zones.values()]
    facts = "; ".join(f"{z['name'].lower()} {z['display'].lower()}" for z in zone_list)

    return {
        "size": row["label"],
        "level": level,
        "label": LEVEL_LABELS[level],
        "detail": DETAILS[level],
        "score": round(score),
        "ease_cm": None,
        "mean_ease_pct": None,
        "ease_pct": {},
        "position": round(max(0.04, min(0.96, 0.5 + 0.12 * offset)), 3),
        "fit_index": round(fit_index, 2),
        "size_steps": steps,
        "zones": zone_list,
        "ml": None,
        "predicted_rating": rating,
        "review_class": rating_to_class(rating),
        "facts": (f"The brand's size chart lists size {row['label']} for a body "
                  f"with {facts}. Person: {body['height']:.0f} cm, "
                  f"{body['weight']:.0f} kg."),
    }


def cannot_wear(assessment: dict) -> bool:
    """
    Whether a size is too small to render a try-on for. With a height/weight
    chart only when BOTH weight is over the range (TIGHT) and height is over
    it (SHORT); otherwise (garment-measurement charts) when it is too tight.
    """
    words = {zone["name"]: zone["word"] for zone in assessment["zones"]}

    if "WEIGHT" in words and "HEIGHT" in words:
        return words["WEIGHT"] == "TIGHT" and words["HEIGHT"] == "SHORT"

    return assessment["level"] == "too_tight"


def assess_all(body: dict, garment: dict, preference: str) -> dict:
    if all(is_range_row(row) for row in garment["size_chart"]):
        sizes, recommended = assess_range_chart(body, garment["size_chart"], preference)
        return {
            "recommended_size": recommended,
            "confidence": "MEDIUM",
            "note": ("From the brand's height/weight size chart: the size is chosen by "
                     "height and fit preference; weight shows where it will be tight or loose."),
            "target_ease_pct": None,
            "measurements_used": sorted({z["name"] for s in sizes for z in s["zones"]}),
            "model_applied": False,
            "sizes": sizes,
        }

    sizes = [assess_size(body, garment, row, preference) for row in garment["size_chart"]]

    candidates = [s for s in sizes if s["level"] != "too_tight"] or sizes
    recommended = max(candidates, key=lambda s: s["score"])["size"]

    used = sorted({z["name"] for s in sizes for z in s["zones"]})
    has_ml = any(s["ml"] for s in sizes)

    if all(is_range_row(row) for row in garment["size_chart"]):
        confidence = "MEDIUM"
        note = ("From the brand's height/weight size chart. It has no garment "
                "measurements, so chest/waist do not change the verdict.")
    elif body.get("sex") != "female":
        confidence = "LOW"
        note = ("No fit reviews from men in the training data yet; this verdict "
                "uses the size chart only. Your reviews help close the gap.")
    elif len(used) >= 2 and has_ml:
        confidence = "HIGH"
        note = "Size chart ease, nudged by the fit model trained on shopper reviews."
    else:
        confidence = "MEDIUM"
        note = "Based mostly on the chest measurement; add waist/hip to the size chart for more accuracy."

    return {
        "recommended_size": recommended,
        "confidence": confidence,
        "note": note,
        "target_ease_pct": target_ease(preference, garment.get("cut", "regular")),
        "measurements_used": used,
        "model_applied": has_ml,
        "sizes": sizes,
    }


def review_features(body: dict, garment: dict, size_label: str) -> dict:
    """Features stored with a purchase so reviews can retrain the fit model."""
    features = _ml_features(body, garment, size_label)
    features["sex"] = body.get("sex", "unspecified")
    return features
