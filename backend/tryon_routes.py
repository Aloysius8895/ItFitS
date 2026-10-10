from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend import feedback, fit_engine, tryon


router = APIRouter(prefix="/api")

MAX_IMAGE_CHARS = 8_000_000  # ~6 MB of base64


class BodyProfile(BaseModel):
    age: float = Field(..., ge=13, le=100)
    height: float = Field(..., ge=120, le=230)
    weight: float = Field(..., ge=30, le=250)
    bust: float = Field(..., ge=60, le=160)
    waist: float = Field(..., ge=45, le=160)
    hip: float = Field(..., ge=60, le=170)


class SizeRow(BaseModel):
    label: str = Field(..., min_length=1, max_length=12)
    bust: Optional[float] = Field(None, gt=0, le=250)
    waist: Optional[float] = Field(None, gt=0, le=250)
    hip: Optional[float] = Field(None, gt=0, le=250)
    numeric_size: Optional[float] = Field(None, ge=0, le=30)


class Garment(BaseModel):
    category: str = Field("dress", min_length=2, max_length=30)
    stretch: Literal["none", "low", "medium", "high"] = "none"
    size_chart: List[SizeRow] = Field(..., min_length=1, max_length=12)


class AnalyzeRequest(BaseModel):
    body: BodyProfile
    garment: Garment


class TryOnRequest(AnalyzeRequest):
    size: str
    person_image: str = Field(..., max_length=MAX_IMAGE_CHARS)
    garment_image: str = Field(..., max_length=MAX_IMAGE_CHARS)


class ReviewRequest(BaseModel):
    prediction_id: str
    actual: Literal["small", "fit", "large"]
    comment: str = Field("", max_length=500)


def _prepare(request: AnalyzeRequest):
    body = request.body.model_dump()
    garment = request.garment.model_dump()
    needed = fit_engine.relevant_measurements(garment["category"])

    for row in garment["size_chart"]:
        missing = [k for k in needed if row.get(k) is None]

        if missing:
            raise HTTPException(
                422,
                f"Size {row['label']} is missing: {', '.join(missing)} "
                f"(needed for category '{garment['category']}').",
            )

    return body, garment


@router.post("/tryon/analyze")
def analyze(request: AnalyzeRequest):
    body, garment = _prepare(request)
    result = fit_engine.assess_all(body, garment)

    for size in result["sizes"]:
        size.pop("features")

    return {"success": True, **result}


@router.post("/tryon/generate")
def generate(request: TryOnRequest):
    body, garment = _prepare(request)

    rows = {row["label"]: row for row in garment["size_chart"]}

    if request.size not in rows:
        raise HTTPException(422, f"Size '{request.size}' is not in the size chart.")

    assessment = fit_engine.assess_size(body, garment, rows[request.size])
    features = assessment.pop("features")

    prediction_id = feedback.save_prediction(
        features, assessment["size"], assessment["level"],
        assessment["review_class"],
    )

    prompt = tryon.build_prompt(body, garment, assessment)

    response = {
        "success": True,
        "prediction_id": prediction_id,
        "assessment": assessment,
        "image": None,
        "image_status": "ok",
        "image_error": None,
    }

    if not tryon.is_configured():
        response["image_status"] = "no_api_key"
        response["image_error"] = tryon.missing_key_message()
        return response

    try:
        response["image"] = tryon.generate_tryon(
            request.person_image, request.garment_image, prompt
        )
    except tryon.TryOnError as error:
        response["image_status"] = "failed"
        response["image_error"] = str(error)

    return response


@router.post("/reviews")
def submit_review(request: ReviewRequest):
    try:
        result = feedback.add_review(
            request.prediction_id, request.actual, request.comment
        )
    except LookupError as error:
        raise HTTPException(404, str(error))
    except ValueError as error:
        raise HTTPException(409, str(error))

    return {"success": True, **result}


@router.get("/reviews/status")
def review_status():
    return {"success": True, **feedback.status()}
