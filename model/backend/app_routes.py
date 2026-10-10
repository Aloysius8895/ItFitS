"""API for the Fitted mobile app (mobile/)."""

import json
import time
import uuid
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from backend import app_fit, feedback, ruler, similar, tryon
from backend.predictor import predictor


router = APIRouter(prefix="/api/app")

MAX_IMAGE_CHARS = 8_000_000  # ~6 MB of base64


class Body(BaseModel):
    sex: Literal["female", "male", "unspecified"] = "unspecified"
    age: Optional[float] = Field(None, ge=13, le=100)
    height: float = Field(..., ge=100, le=230)
    weight: float = Field(..., ge=25, le=250)
    chest: float = Field(..., ge=50, le=180)
    waist: float = Field(..., ge=40, le=180)
    hip: Optional[float] = Field(None, ge=50, le=190)
    shoulder: Optional[float] = Field(None, ge=25, le=70)


class SizeRow(BaseModel):
    """Garment measurements (chest...) or body ranges from a ruler/ chart."""
    label: str = Field(..., min_length=1, max_length=12)
    chest: Optional[float] = Field(None, gt=0, le=250)
    waist: Optional[float] = Field(None, gt=0, le=250)
    hip: Optional[float] = Field(None, gt=0, le=250)
    shoulder: Optional[float] = Field(None, gt=0, le=90)
    length: Optional[float] = Field(None, gt=0, le=200)
    height_min: Optional[float] = Field(None, gt=0, le=250)
    height_max: Optional[float] = Field(None, gt=0, le=250)
    weight_min: Optional[float] = Field(None, gt=0, le=300)
    weight_max: Optional[float] = Field(None, gt=0, le=300)

    @model_validator(mode="after")
    def needs_chest_or_ranges(self):
        if self.chest is None and self.height_min is None and self.weight_min is None:
            raise ValueError(f"size {self.label}: needs chest or a height/weight range")
        return self


class Garment(BaseModel):
    id: Optional[str] = Field(None, max_length=60)
    name: str = Field("Garment", max_length=80)
    category: str = Field(..., min_length=2, max_length=30)
    cut: str = Field("regular", max_length=20)
    stretch: Literal["none", "low", "medium", "high"] = "none"
    material: Optional[str] = Field(None, max_length=80)
    color: Optional[str] = Field(None, max_length=20)
    size_chart: List[SizeRow] = Field(..., min_length=1, max_length=12)


Preference = Literal["fitted", "regular", "relaxed", "oversize"]


class FitRequest(BaseModel):
    body: Body
    garment: Garment
    preference: Preference = "regular"


class SizeRequest(FitRequest):
    size: str = Field(..., min_length=1, max_length=12)


class TryOnRequest(SizeRequest):
    """
    First render: person_image (the anchor, usually the recommended size).
    Other sizes: anchor_image + anchor_size, edited so only the fit changes.
    """
    person_image: Optional[str] = Field(None, max_length=MAX_IMAGE_CHARS)
    anchor_image: Optional[str] = Field(None, max_length=MAX_IMAGE_CHARS)
    anchor_size: Optional[str] = Field(None, max_length=12)
    # The try-on is drawn only from this uploaded garment photo.
    garment_image: str = Field(..., min_length=30, max_length=MAX_IMAGE_CHARS)

    @model_validator(mode="after")
    def needs_person_or_anchor(self):
        if self.anchor_image and not self.anchor_size:
            raise ValueError("anchor_size is required with anchor_image")
        if not self.anchor_image and not self.person_image:
            raise ValueError("send person_image, or anchor_image + anchor_size")
        return self


class ReviewRequest(BaseModel):
    prediction_id: str = Field(..., max_length=40)
    rating: int = Field(..., ge=1, le=9)
    zones: List[str] = Field(default_factory=list, max_length=8)


def _parse(request: FitRequest):
    body = request.body.model_dump()
    garment = request.garment.model_dump()
    garment["cut"] = garment["cut"].lower()
    return body, garment


def _assess_one(request: SizeRequest):
    body, garment = _parse(request)
    rows = {row["label"]: row for row in garment["size_chart"]}

    if request.size not in rows:
        raise HTTPException(422, f"Size '{request.size}' is not in the size chart.")

    assessment = app_fit.assess_size(body, garment, rows[request.size], request.preference)
    return body, garment, assessment


@router.get("/charts")
def charts():
    """Size charts from the ruler/ folder, re-read on every call."""
    return {"success": True, **ruler.load_all()}


@router.post("/fit")
def fit(request: FitRequest):
    body, garment = _parse(request)
    result = app_fit.assess_all(body, garment, request.preference)
    labels = [row["label"] for row in garment["size_chart"]]

    return {
        "success": True,
        **result,
        "similar": similar.similar_bodies(body, garment["category"], labels),
    }


@router.post("/tryon")
def try_on(request: TryOnRequest):
    body, garment, assessment = _assess_one(request)

    response = {
        "success": True,
        "assessment": assessment,
        "engine": tryon.config.TRYON_PROVIDER,
        "image": None,
        "image_status": "ok",
        "image_error": None,
    }

    if app_fit.cannot_wear(assessment):
        # Clearly too small: tell the user it won't fit instead of rendering it.
        response["image_status"] = "too_small"
        response["image_error"] = f"Size {request.size} is too small for this body."
        return response

    if not tryon.is_configured():
        response["image_status"] = "no_api_key"
        response["image_error"] = tryon.missing_key_message()
        return response

    if request.anchor_image:
        labels = [row["label"] for row in garment["size_chart"]]
        if request.anchor_size not in labels:
            raise HTTPException(422, f"Size '{request.anchor_size}' is not in the size chart.")

        anchor_row = garment["size_chart"][labels.index(request.anchor_size)]
        anchor = app_fit.assess_size(body, garment, anchor_row, request.preference)
        steps = labels.index(request.size) - labels.index(request.anchor_size)

        if steps == 0:
            response["image"] = request.anchor_image
            return response

        group = app_fit.category_group(garment["category"])
        prompt = tryon.build_size_edit_prompt(anchor, assessment, steps, group)
        first_image = request.anchor_image
    else:
        prompt = tryon.build_app_prompt(body, assessment)
        first_image = request.person_image

    try:
        response["image"] = tryon.generate_tryon(
            first_image, request.garment_image, prompt
        )
    except tryon.TryOnError as error:
        response["image_status"] = "failed"
        response["image_error"] = str(error)

    return response


@router.post("/purchases")
def purchase(request: SizeRequest):
    """Record a purchase so its later review can be compared with the prediction."""
    body, garment, assessment = _assess_one(request)

    features = app_fit.review_features(body, garment, request.size)
    features["predicted_rating"] = assessment["predicted_rating"]
    features["product"] = garment.get("id") or garment["name"]

    prediction_id = feedback.save_prediction(
        features, request.size, assessment["level"], assessment["review_class"]
    )

    return {
        "success": True,
        "prediction_id": prediction_id,
        "predicted_rating": assessment["predicted_rating"],
        "level": assessment["level"],
        "label": assessment["label"],
    }


@router.post("/reviews")
def review(request: ReviewRequest):
    prediction = feedback.get_prediction(request.prediction_id)

    if prediction is None:
        raise HTTPException(404, "Unknown purchase.")

    actual = app_fit.rating_to_class(request.rating)
    comment = json.dumps({"rating": request.rating, "zones": request.zones})

    try:
        result = feedback.add_review(request.prediction_id, actual, comment)
    except ValueError as error:
        raise HTTPException(409, str(error))

    return {
        "success": True,
        "actual_class": actual,
        "predicted_class": prediction["review_class"],
        "predicted_rating": prediction["features"].get("predicted_rating"),
        "match": actual == prediction["review_class"],
        **result,
        "accuracy": feedback.accuracy_history(),
    }


@router.get("/status")
def status():
    metadata = predictor.metadata or {}
    best = metadata.get("best_model")

    return {
        "success": True,
        "model": {
            "loaded": predictor.pipeline is not None,
            "name": best,
            "version": metadata.get("model_version", 1),
            "training_rows": metadata.get("training_rows"),
            "accuracy": metadata.get("model_results", {}).get(best, {}).get("accuracy"),
            "trained_on_sexes": metadata.get("trained_on_sexes", ["female"]),
        },
        "tryon": {
            "provider": tryon.config.TRYON_PROVIDER,
            "configured": tryon.is_configured(),
        },
        "reviews": feedback.status(),
        "accuracy": feedback.accuracy_history(),
    }


# --- Mock store -> ItFitS hand-off ------------------------------------------
# The mock store posts the product the shopper wants to try on; ItFitS picks
# up the latest one when its TRY ON screen opens. Deep-link parameters are
# not reliably passed when Expo Go switches between two projects, so the
# backend (reachable by both apps) carries the product instead.
HANDOFF_TTL_SECONDS = 600
_handoff: dict = {}


class HandoffRequest(BaseModel):
    garment_image: str = Field(..., min_length=30, max_length=MAX_IMAGE_CHARS,
                               pattern=r"^data:image/[\w.+-]+;base64,")
    size: Optional[str] = Field(None, max_length=12)
    name: Optional[str] = Field(None, max_length=80)


@router.post("/handoff")
def create_handoff(request: HandoffRequest):
    _handoff.clear()
    _handoff.update(id=uuid.uuid4().hex[:12], created_at=time.time(), **request.model_dump())
    return {"success": True, "id": _handoff["id"]}


@router.get("/handoff/latest")
def latest_handoff():
    if not _handoff or time.time() - _handoff["created_at"] > HANDOFF_TTL_SECONDS:
        return {"success": True, "handoff": None}
    return {"success": True, "handoff": _handoff}
