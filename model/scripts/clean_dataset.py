from pathlib import Path
import json
import re

import numpy as np
import pandas as pd


# ============================================================
# FLOWFIT - RENT THE RUNWAY DATA CLEANING
# ============================================================

ROOT = Path(__file__).resolve().parents[1]

RAW_FILE = ROOT / "data" / "raw" / "renttherunway_final_data.json"
CLEAN_FILE = ROOT / "data" / "clean" / "flowfit_clean.csv"


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def parse_number(value):
    """
    Extract the first numeric value from a string.
    """
    if pd.isna(value):
        return np.nan

    match = re.search(r"[-+]?\d*\.?\d+", str(value))

    if match:
        return float(match.group())

    return np.nan


def convert_height_to_cm(value):
    """
    Convert common Rent the Runway height formats to centimeters.

    Examples:
        5' 4"  -> 162.56 cm
        5'4"    -> 162.56 cm
        64      -> 162.56 cm
        162      -> 162 cm
    """

    if pd.isna(value):
        return np.nan

    text = str(value).strip().lower()

    # Feet + inches
    match = re.search(
        r"(\d+)\s*(?:'|ft)\s*(\d+)?",
        text
    )

    if match:
        feet = float(match.group(1))
        inches = float(match.group(2) or 0)

        return feet * 30.48 + inches * 2.54

    number = parse_number(text)

    if pd.isna(number):
        return np.nan

    # If the value is small, assume inches
    if number < 8:
        return number * 30.48

    # Typical height in inches
    if 30 <= number <= 90:
        return number * 2.54

    # Already approximately centimeters
    return number


def convert_weight_to_kg(value):
    """
    Convert weight to kilograms.

    Rent the Runway weight values are generally given
    in pounds.
    """

    if pd.isna(value):
        return np.nan

    number = parse_number(value)

    if pd.isna(number):
        return np.nan

    # Typical human weight represented in pounds
    if number > 90:
        return number * 0.45359237

    # Otherwise treat as kg
    return number


def clean_text_column(series):
    """
    Normalize categorical/text values.
    """
    return (
        series
        .astype("string")
        .str.strip()
        .str.lower()
        .replace({
            "nan": pd.NA,
            "none": pd.NA,
            "null": pd.NA,
            "": pd.NA
        })
    )


# ------------------------------------------------------------
# Check source file
# ------------------------------------------------------------

if not RAW_FILE.exists():
    raise FileNotFoundError(
        f"\nRent the Runway dataset was not found.\n\n"
        f"Expected location:\n{RAW_FILE}\n"
    )


print("=" * 70)
print("FLOWFIT - DATA CLEANING")
print("=" * 70)

print(f"\nRaw dataset:")
print(RAW_FILE)


# ------------------------------------------------------------
# Load JSON
# ------------------------------------------------------------

print("\n[1/8] Loading Rent the Runway JSON...")

records = []

with RAW_FILE.open(
    "r",
    encoding="utf-8"
) as file:

    for line in file:

        line = line.strip()

        if not line:
            continue

        try:
            records.append(json.loads(line))

        except json.JSONDecodeError:
            continue


df = pd.DataFrame(records)

print(f"Loaded rows: {len(df):,}")
print(f"Original columns: {len(df.columns)}")


# ------------------------------------------------------------
# Normalize column names
# ------------------------------------------------------------

print("\n[2/8] Normalizing column names...")

df.columns = [
    str(column)
    .strip()
    .lower()
    .replace(" ", "_")
    .replace("-", "_")
    for column in df.columns
]

print("\nAvailable columns:")

for column in df.columns:
    print("  -", column)


# ------------------------------------------------------------
# Verify required fields
# ------------------------------------------------------------

required_columns = [
    "fit",
    "age",
    "height",
    "weight",
    "body_type",
    "bust_size",
    "category",
    "size",
    "rating",
    "rented_for"
]

missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing_columns:

    raise ValueError(
        "\nThe dataset is missing required columns:\n"
        + "\n".join(
            f"  - {column}"
            for column in missing_columns
        )
    )


# ------------------------------------------------------------
# Remove duplicate records
# ------------------------------------------------------------

print("\n[3/8] Removing duplicate records...")

before = len(df)

df = df.drop_duplicates()

after = len(df)

print(f"Removed duplicates: {before - after:,}")


# ------------------------------------------------------------
# Clean target
# ------------------------------------------------------------

print("\n[4/8] Cleaning target variable: fit")

df["fit"] = (
    df["fit"]
    .astype("string")
    .str.strip()
    .str.lower()
)

valid_fit_values = [
    "small",
    "fit",
    "large"
]

df = df[
    df["fit"].isin(valid_fit_values)
].copy()

print("\nFit distribution:")

print(
    df["fit"]
    .value_counts()
)


# ------------------------------------------------------------
# Clean numerical variables
# ------------------------------------------------------------

print("\n[5/8] Cleaning numerical variables...")

df["age"] = pd.to_numeric(
    df["age"],
    errors="coerce"
)

df["height_cm"] = (
    df["height"]
    .apply(convert_height_to_cm)
)

df["weight_kg"] = (
    df["weight"]
    .apply(convert_weight_to_kg)
)

df["rating"] = pd.to_numeric(
    df["rating"],
    errors="coerce"
)

df["size"] = pd.to_numeric(
    df["size"],
    errors="coerce"
)


# ------------------------------------------------------------
# Clean categorical variables
# ------------------------------------------------------------

print("\n[6/8] Cleaning categorical variables...")

categorical_columns = [
    "body_type",
    "bust_size",
    "category",
    "rented_for"
]

for column in categorical_columns:

    df[column] = clean_text_column(
        df[column]
    )


# ------------------------------------------------------------
# Remove impossible values
# ------------------------------------------------------------

print("\n[7/8] Removing invalid measurements...")

before = len(df)

df = df[
    df["age"].between(
        13,
        100
    )
]

df = df[
    df["height_cm"].between(
        120,
        230
    )
]

df = df[
    df["weight_kg"].between(
        30,
        250
    )
]

df = df[
    df["rating"].between(
        1,
        5
    )
]

df = df[
    df["size"].between(
        0,
        30
    )
]

after = len(df)

print(
    f"Removed invalid rows: "
    f"{before - after:,}"
)


# ------------------------------------------------------------
# Select FLOWFIT features
# ------------------------------------------------------------

feature_columns = [
    "age",
    "height_cm",
    "weight_kg",
    "body_type",
    "bust_size",
    "category",
    "size",
    "rating",
    "rented_for",
    "fit"
]

clean_df = df[
    feature_columns
].copy()


# ------------------------------------------------------------
# Missing-value strategy
# ------------------------------------------------------------

print("\nMissing values before final cleaning:")

print(
    clean_df.isna()
    .sum()
)


# Target cannot be missing
clean_df = clean_df.dropna(
    subset=["fit"]
)


# Numeric missing values are handled by
# the ML preprocessing pipeline.
#
# Categorical missing values are also handled
# by the ML preprocessing pipeline.
#
# Therefore, we intentionally keep those rows.


# ------------------------------------------------------------
# Save cleaned dataset
# ------------------------------------------------------------

CLEAN_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

clean_df.to_csv(
    CLEAN_FILE,
    index=False
)


# ------------------------------------------------------------
# Final report
# ------------------------------------------------------------

print("\n[8/8] Cleaning complete!")

print("\n" + "=" * 70)
print("FLOWFIT CLEAN DATASET")
print("=" * 70)

print(
    f"\nOriginal rows : {len(records):,}"
)

print(
    f"Clean rows    : {len(clean_df):,}"
)

print(
    f"Rows removed  : "
    f"{len(records) - len(clean_df):,}"
)

print(
    f"\nColumns       : "
    f"{len(clean_df.columns)}"
)

print(
    f"\nSaved to:\n{CLEAN_FILE}"
)

print("\nFinal columns:")

for column in clean_df.columns:
    print("  -", column)

print("\nFit distribution:")

print(
    clean_df["fit"]
    .value_counts()
)

print("\nDataset preview:")

print(
    clean_df.head()
)

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)