import threading
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.preprocessing import normalize_input
from backend.predictor import predictor
from backend.tryon_routes import router as tryon_router
from backend.app_routes import router as app_router
from backend import similar


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "clean" / "flowfit_clean.csv"


app = FastAPI(
    title="FLOWFIT API",
    description="AI-Powered Fashion Fit Intelligence",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tryon_router)
app.include_router(app_router)


@app.on_event("startup")
def warm_similar_bodies():
    # Loading the review CSV takes a few seconds; do it before the first request.
    threading.Thread(target=similar._load, daemon=True).start()


class FitRequest(BaseModel):
    age: float = Field(..., ge=13, le=100)
    height: float = Field(..., ge=120, le=230)
    weight: float = Field(..., ge=30, le=250)

    body_type: str
    bust_size: str
    category: str

    size: float = Field(..., ge=0, le=30)
    rating: float = Field(..., ge=1, le=5)

    rented_for: str


def generate_fit_explanation(
    fit: str,
    confidence: Optional[float],
    data: dict
):
    """
    Generate a human-readable explanation
    for the predicted fit.
    """

    fit = fit.lower()

    explanations = []

    height = data.get("height_cm")
    weight = data.get("weight_kg")
    size = data.get("size")
    category = data.get("category")
    body_type = data.get("body_type")
    rating = data.get("rating")

    if fit == "fit":

        explanations.append(
            "The selected garment size aligns well "
            "with the historical fit patterns learned "
            "by FLOWFIT."
        )

    elif fit == "small":

        explanations.append(
            "The model identifies a higher likelihood "
            "that the selected garment may feel smaller "
            "than expected."
        )

    elif fit == "large":

        explanations.append(
            "The model identifies a higher likelihood "
            "that the selected garment may feel larger "
            "than expected."
        )

    if category:

        explanations.append(
            f"The prediction also considers the "
            f"garment category '{category}'."
        )

    if body_type:

        explanations.append(
            f"Your selected body profile "
            f"('{body_type}') is included in the "
            f"fit assessment."
        )

    if height and weight:

        bmi_proxy = weight / (
            (height / 100) ** 2
        )

        if bmi_proxy < 18.5:

            explanations.append(
                "Your height-to-weight profile "
                "suggests a relatively lean measurement "
                "pattern within the supplied inputs."
            )

        elif bmi_proxy >= 25:

            explanations.append(
                "Your height-to-weight profile "
                "suggests a relatively fuller measurement "
                "pattern within the supplied inputs."
            )

        else:

            explanations.append(
                "Your height-to-weight profile falls "
                "within a mid-range measurement pattern "
                "for the supplied inputs."
            )

    if size is not None:

        explanations.append(
            f"The analysis uses your current garment "
            f"size of {size:g} as one of its input features."
        )

    if rating is not None:

        explanations.append(
            f"Your rating input of {rating:g}/5 "
            f"is also considered by the trained model."
        )

    if confidence is not None:

        if confidence >= 85:

            explanations.append(
                "The model has high confidence in this "
                "prediction."
            )

        elif confidence >= 60:

            explanations.append(
                "The model has moderate confidence, so "
                "the result should be treated as guidance."
            )

        else:

            explanations.append(
                "The model has lower confidence, so "
                "consider this result as an estimate rather "
                "than a definitive fit decision."
            )

    return explanations


def calculate_fit_risk(
    fit: str,
    confidence: Optional[float]
):
    """
    Fit-risk proxy.

    This is NOT an actual return prediction.
    """

    fit = fit.lower()

    if fit == "fit":
        risk = "Low"

    elif fit in {"small", "large"}:
        risk = "High"

    else:
        risk = "Medium"

    if confidence is not None and confidence < 60:
        risk = "Medium"

    return risk


def recommend_size(
    current_size: float,
    fit: str
):
    """
    Simple fit-based size heuristic.
    """

    fit = fit.lower()

    if fit == "small":
        return current_size + 1

    if fit == "large":
        return max(0, current_size - 1)

    return current_size


@app.get("/")
def root():

    return {
        "name": "FLOWFIT",
        "message": "AI-Powered Fashion Fit Intelligence",
        "status": "running",
    }


@app.get("/api/health")
def health():

    return {
        "status": "healthy",
        "model_loaded": predictor.pipeline is not None,
        "dataset_available": DATA_PATH.exists(),
    }


@app.post("/api/predict-fit")
def predict_fit(
    request: FitRequest
):

    input_data = normalize_input(
        request.model_dump()
    )

    result = predictor.predict(
        input_data
    )

    fit = result["fit"]
    confidence = result["confidence"]

    return {
        "success": True,

        "prediction": {
            "fit": fit,
            "confidence": confidence,
            "probabilities":
                result["probabilities"],
        },

        "fit_risk":
            calculate_fit_risk(
                fit,
                confidence
            ),
    }


@app.post("/api/recommend-size")
def recommend_size_endpoint(
    request: FitRequest
):

    input_data = normalize_input(
        request.model_dump()
    )

    result = predictor.predict(
        input_data
    )

    fit = result["fit"]

    recommended = recommend_size(
        request.size,
        fit
    )

    return {
        "success": True,
        "current_size": request.size,
        "predicted_fit": fit,
        "recommended_size": recommended,

        "note":
            "Size recommendation is a heuristic "
            "based on predicted fit class.",
    }

def get_fit_guidance(
    fit: str,
    risk: str
):

    fit = fit.lower()

    if fit == "fit":

        return {
            "headline":
                "Your selected size looks well aligned.",

            "message":
                "FLOWFIT sees a strong historical fit "
                "match between your profile and the "
                "selected garment.",

            "action":
                "Your current size is a reasonable "
                "choice to consider."
        }

    if fit == "small":

        return {
            "headline":
                "Consider sizing up.",

            "message":
                "FLOWFIT estimates that the selected "
                "garment may feel smaller than expected.",

            "action":
                "Consider trying the next available "
                "size if the garment allows it."
        }

    if fit == "large":

        return {
            "headline":
                "Consider sizing down.",

            "message":
                "FLOWFIT estimates that the selected "
                "garment may feel larger than expected.",

            "action":
                "Consider trying the previous available "
                "size if the garment allows it."
        }

    return {
        "headline":
            "Fit requires additional consideration.",

        "message":
            "The model did not produce a strong "
            "fit classification.",

        "action":
            "Use the prediction together with the "
            "garment's sizing information."
    }


@app.post("/api/fit-analysis")
def fit_analysis(
        request: FitRequest
    ):

        input_data = normalize_input(
            request.model_dump()
        )

        result = predictor.predict(
            input_data
        )

        fit = result["fit"]

        confidence = result["confidence"]

        recommended = recommend_size(
            request.size,
            fit
        )

        risk = calculate_fit_risk(
            fit,
            confidence
        )

        explanations = generate_fit_explanation(
            fit,
            confidence,
            input_data
        )

        return {

            "success": True,

            "fit": fit,

            "confidence": confidence,

            "fit_risk": risk,

            "current_size":
                request.size,

            "recommended_size":
                recommended,

            "probabilities":
                result["probabilities"],

            "explanation":
                explanations,

            "guidance":
                get_fit_guidance(
                fit,
                risk
            ),
    }

@app.get("/api/analytics")
def analytics():

    if not DATA_PATH.exists():

        return {
            "success": False,
            "error": "Clean dataset not found.",
        }

    df = pd.read_csv(DATA_PATH)

    # ---------------------------------------------------------
    # BASIC DATASET STATISTICS
    # ---------------------------------------------------------

    total_records = len(df)

    average_age = None
    if "age" in df.columns:
        age_values = pd.to_numeric(
            df["age"],
            errors="coerce"
        ).dropna()

        if not age_values.empty:
            average_age = round(
                float(age_values.mean()),
                1
            )

    average_rating = None
    if "rating" in df.columns:
        rating_values = pd.to_numeric(
            df["rating"],
            errors="coerce"
        ).dropna()

        if not rating_values.empty:
            average_rating = round(
                float(rating_values.mean()),
                2
            )

    average_size = None
    if "size" in df.columns:
        size_values = pd.to_numeric(
            df["size"],
            errors="coerce"
        ).dropna()

        if not size_values.empty:
            average_size = round(
                float(size_values.mean()),
                1
            )

    # ---------------------------------------------------------
    # FIT DISTRIBUTION
    # ---------------------------------------------------------

    fit_distribution = {}

    if "fit" in df.columns:

        fit_distribution = (
            df["fit"]
            .dropna()
            .astype(str)
            .str.strip()
            .str.lower()
            .value_counts()
            .to_dict()
        )

    # ---------------------------------------------------------
    # TOP CATEGORIES
    # ---------------------------------------------------------

    category_distribution = {}

    if "category" in df.columns:

        category_values = (
            df["category"]
            .dropna()
            .astype(str)
            .str.strip()
        )

        category_values = category_values[
            category_values != ""
        ]

        category_distribution = (
            category_values
            .value_counts()
            .head(10)
            .to_dict()
        )

    # ---------------------------------------------------------
    # RENTED FOR
    # ---------------------------------------------------------

    rented_for_distribution = {}

    if "rented_for" in df.columns:

        rented_values = (
            df["rented_for"]
            .dropna()
            .astype(str)
            .str.strip()
        )

        rented_values = rented_values[
            rented_values != ""
        ]

        rented_for_distribution = (
            rented_values
            .value_counts()
            .head(10)
            .to_dict()
        )

    # ---------------------------------------------------------
    # MODEL METADATA
    # ---------------------------------------------------------

    model_metadata = predictor.metadata or {}

    # ---------------------------------------------------------
    # RESPONSE
    #
    # The frontend expects these values at the top level.
    # We also keep the structured dataset/model objects so
    # the API remains useful for future development.
    # ---------------------------------------------------------

    return {

        "success": True,

        # Frontend-compatible dataset statistics
        "total_records": total_records,

        "average_age": average_age,

        "average_rating": average_rating,

        "average_size": average_size,

        # Frontend-compatible category name
        "top_categories":
            category_distribution,

        # Fit distribution
        "fit_distribution":
            fit_distribution,

        # Additional analytics
        "rented_for_distribution":
            rented_for_distribution,

        # Frontend-compatible model metadata
        "model_metadata":
            model_metadata,

        # Keep the structured versions too
        "dataset": {

            "total_records":
                total_records,

            "average_age":
                average_age,

            "average_rating":
                average_rating,

            "average_size":
                average_size,
        },

        "category_distribution":
            category_distribution,

        "model":
            model_metadata,
    }