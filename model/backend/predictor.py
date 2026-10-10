
from pathlib import Path
import json
import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "fit_model.pkl"
METADATA_PATH = BASE_DIR / "models" / "model_metadata.json"


class FlowFitPredictor:
    def __init__(self):
        self.pipeline = None
        self.metadata = {}

        if METADATA_PATH.exists():
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

        self.load_error = None

        if MODEL_PATH.exists():
            try:
                self.pipeline = joblib.load(MODEL_PATH)
            except Exception as error:
                # Usually a scikit-learn version mismatch; the app still works
                # from the size chart alone.
                self.load_error = f"{type(error).__name__}: {error}"

    def predict(self, data: dict):
        if self.pipeline is None:
            raise RuntimeError(
                "The trained FLOWFIT model is unavailable. "
                "The model artifact must be deployed before predictions can run."
            )

        df = pd.DataFrame([data])
        prediction = self.pipeline.predict(df)[0]

        probability_map = {}
        confidence = None

        if hasattr(self.pipeline, "predict_proba"):
            probabilities = self.pipeline.predict_proba(df)[0]
            confidence = float(max(probabilities))
            probability_map = {
                str(cls): round(float(prob), 4)
                for cls, prob in zip(self.pipeline.classes_, probabilities)
            }

        return {
            "fit": str(prediction).lower(),
            "confidence": round(confidence * 100, 2)
            if confidence is not None else None,
            "probabilities": probability_map,
        }


predictor = FlowFitPredictor()
