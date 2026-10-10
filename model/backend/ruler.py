"""
Size charts from the repository's ruler/ folder (one CSV per chart).

Re-read on every call so new charts appear without restarting the server.
Weights are always returned in kg (1 jin = 0.5 kg). See ruler/README.md.
"""

import csv
from pathlib import Path

from backend import config


RULER_DIR = config.BASE_DIR.parent / "ruler"

RANGE_COLUMNS = {
    "height_min_cm": ("height_min", 1.0),
    "height_max_cm": ("height_max", 1.0),
    "weight_min_kg": ("weight_min", 1.0),
    "weight_max_kg": ("weight_max", 1.0),
    "weight_min_jin": ("weight_min", 0.5),
    "weight_max_jin": ("weight_max", 0.5),
}
GARMENT_COLUMNS = {
    "chest_cm": "chest", "waist_cm": "waist", "hip_cm": "hip",
    "shoulder_cm": "shoulder", "length_cm": "length",
}


class ChartError(ValueError):
    pass


def _number(value: str, column: str, size: str) -> float:
    try:
        number = float(value)
    except ValueError:
        raise ChartError(f"size {size}: {column} '{value}' is not a number")

    if number <= 0:
        raise ChartError(f"size {size}: {column} must be positive")

    return number


def _parse_row(raw: dict) -> dict:
    size = (raw.get("size") or "").strip().upper()

    if not size:
        raise ChartError("a row has no size")

    row = {"label": size}

    for column, (key, factor) in RANGE_COLUMNS.items():
        if (raw.get(column) or "").strip():
            row[key] = round(_number(raw[column], column, size) * factor, 2)

    for column, key in GARMENT_COLUMNS.items():
        if (raw.get(column) or "").strip():
            row[key] = _number(raw[column], column, size)

    for low, high in (("height_min", "height_max"), ("weight_min", "weight_max")):
        if (low in row) != (high in row):
            raise ChartError(f"size {size}: {low} and {high} must both be given")
        if low in row and row[low] > row[high]:
            raise ChartError(f"size {size}: {low} is larger than {high}")

    if "chest" not in row and "height_min" not in row and "weight_min" not in row:
        raise ChartError(f"size {size}: needs a height/weight range or chest_cm")

    return row


def load_chart(path: Path) -> dict:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = [_parse_row({k.strip().lower(): v for k, v in raw.items() if k})
                for raw in reader]

    if not rows:
        raise ChartError("no sizes")

    labels = [row["label"] for row in rows]
    if len(set(labels)) != len(labels):
        raise ChartError("duplicate size labels")

    return {
        "id": f"ruler:{path.stem}",
        "name": path.stem.replace("_", " ").upper(),
        "file": path.name,
        "kind": "garment" if "chest" in rows[0] else "body_range",
        "size_chart": rows,
    }


def load_all() -> dict:
    charts, errors = [], []

    for path in sorted(RULER_DIR.glob("*.csv")):
        try:
            charts.append(load_chart(path))
        except (ChartError, csv.Error, UnicodeDecodeError) as error:
            errors.append({"file": path.name, "error": str(error)})

    return {"charts": charts, "errors": errors}
