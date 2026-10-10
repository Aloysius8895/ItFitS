from pathlib import Path
import json
import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from sklearn.model_selection import train_test_split

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)


# ============================================================
# FLOWFIT - MODEL TRAINING
# ============================================================

ROOT = Path(__file__).resolve().parents[1]

DATA_FILE = ROOT / "data" / "clean" / "flowfit_clean.csv"
MODEL_FILE = ROOT / "models" / "fit_model.pkl"
METADATA_FILE = ROOT / "models" / "model_metadata.json"


# ============================================================
# 1. CHECK DATASET
# ============================================================

if not DATA_FILE.exists():

    raise FileNotFoundError(
        f"""
Clean dataset not found.

Expected:
{DATA_FILE}

Run first:

python scripts/clean_dataset.py
"""
    )


print("=" * 70)
print("FLOWFIT - MODEL TRAINING")
print("=" * 70)


# ============================================================
# 2. LOAD DATA
# ============================================================

print("\n[1/8] Loading cleaned dataset...")

df = pd.read_csv(DATA_FILE)

print(f"Rows: {len(df):,}")
print(f"Columns: {len(df.columns)}")


# ============================================================
# 3. FEATURES / TARGET
# ============================================================

print("\n[2/8] Preparing features...")

TARGET = "fit"

FEATURES = [
    "age",
    "height_cm",
    "weight_kg",
    "body_type",
    "bust_size",
    "category",
    "size",
    "rating",
    "rented_for"
]

X = df[FEATURES].copy()
y = df[TARGET].copy()


numeric_features = [
    "age",
    "height_cm",
    "weight_kg",
    "size",
    "rating"
]

categorical_features = [
    "body_type",
    "bust_size",
    "category",
    "rented_for"
]


# ============================================================
# 4. PREPROCESSING
# ============================================================

print("\n[3/8] Building preprocessing pipeline...")


numeric_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="median")
        ),
        (
            "scaler",
            StandardScaler()
        )
    ]
)


categorical_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="most_frequent")
        ),
        (
            "encoder",
            OneHotEncoder(
                handle_unknown="ignore"
            )
        )
    ]
)


preprocessor = ColumnTransformer(
    transformers=[
        (
            "numeric",
            numeric_pipeline,
            numeric_features
        ),
        (
            "categorical",
            categorical_pipeline,
            categorical_features
        )
    ]
)


# ============================================================
# 5. TRAIN / TEST SPLIT
# ============================================================

print("\n[4/8] Splitting dataset...")


X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


print(f"Training rows: {len(X_train):,}")
print(f"Testing rows : {len(X_test):,}")


# ============================================================
# 6. MODELS
# ============================================================

models = {

    "Logistic Regression":
        LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42
        ),

    "Random Forest":
        RandomForestClassifier(
            n_estimators=250,
            max_depth=None,
            min_samples_split=2,
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=-1
        ),

    "Gradient Boosting":
        GradientBoostingClassifier(
            n_estimators=150,
            learning_rate=0.08,
            max_depth=3,
            random_state=42
        )
}


results = {}

trained_pipelines = {}


# ============================================================
# 7. TRAIN + EVALUATE
# ============================================================

print("\n[5/8] Training models...")


for model_name, classifier in models.items():

    print("\n" + "-" * 60)
    print(f"Training: {model_name}")
    print("-" * 60)

    pipeline = Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor
            ),
            (
                "classifier",
                classifier
            )
        ]
    )

    pipeline.fit(
        X_train,
        y_train
    )

    predictions = pipeline.predict(
        X_test
    )

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    precision = precision_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    recall = recall_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    f1 = f1_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    results[model_name] = {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4)
    }

    trained_pipelines[model_name] = pipeline

    print(
        f"Accuracy : {accuracy:.4f}"
    )

    print(
        f"Precision: {precision:.4f}"
    )

    print(
        f"Recall   : {recall:.4f}"
    )

    print(
        f"F1 Score : {f1:.4f}"
    )


# ============================================================
# 8. SELECT BEST MODEL
# ============================================================

print("\n[6/8] Selecting best model...")


best_model_name = max(
    results,
    key=lambda name: results[name]["f1_score"]
)


best_pipeline = trained_pipelines[
    best_model_name
]


best_predictions = best_pipeline.predict(
    X_test
)


report = classification_report(
    y_test,
    best_predictions,
    output_dict=True,
    zero_division=0
)


matrix = confusion_matrix(
    y_test,
    best_predictions
).tolist()


print("\n" + "=" * 70)

print(
    f"BEST MODEL: {best_model_name}"
)

print("=" * 70)


print(
    f"Accuracy : "
    f"{results[best_model_name]['accuracy']}"
)

print(
    f"F1 Score : "
    f"{results[best_model_name]['f1_score']}"
)


# ============================================================
# SAVE MODEL
# ============================================================

print("\n[7/8] Saving model...")


MODEL_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)


joblib.dump(
    best_pipeline,
    MODEL_FILE
)


# ============================================================
# SAVE METADATA
# ============================================================

metadata = {

    "project": "FLOWFIT",

    "target": TARGET,

    "features": FEATURES,

    "numeric_features": numeric_features,

    "categorical_features": categorical_features,

    "best_model": best_model_name,

    "models_compared": list(models.keys()),

    "model_results": results,

    "classification_report": report,

    "confusion_matrix": matrix,

    "training_rows": len(X_train),

    "testing_rows": len(X_test),

    "total_rows": len(df),

    "random_state": 42

}


METADATA_FILE.write_text(
    json.dumps(
        metadata,
        indent=4,
        default=float
    ),
    encoding="utf-8"
)


print(f"\nModel saved:")
print(MODEL_FILE)

print(f"\nMetadata saved:")
print(METADATA_FILE)


# ============================================================
# FINAL SUMMARY
# ============================================================

print("\n[8/8] TRAINING COMPLETE")

print("\nModel comparison:")

for name, metrics in results.items():

    print(
        f"\n{name}"
    )

    print(
        f"  Accuracy : {metrics['accuracy']}"
    )

    print(
        f"  Precision: {metrics['precision']}"
    )

    print(
        f"  Recall   : {metrics['recall']}"
    )

    print(
        f"  F1 Score : {metrics['f1_score']}"
    )


print("\n" + "=" * 70)

print(
    f"FINAL MODEL: {best_model_name}"
)

print("=" * 70)
