import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


def _load_env_file():
    """Minimal .env loader (no extra dependency). Real env vars win."""
    env_path = BASE_DIR / ".env"

    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file()


# --- Gemini virtual try-on -------------------------------------------------
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_IMAGE_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")

# --- Grafilab (OpenAI-compatible gateway) ----------------------------------
GRAFILAB_API_KEY = os.environ.get("GRAFILAB_API_KEY", "")
GRAFILAB_BASE_URL = os.environ.get("GRAFILAB_BASE_URL", "https://llm.grafilab.ai/v1")
GRAFILAB_IMAGE_MODEL = os.environ.get("GRAFILAB_IMAGE_MODEL", "gemini/gemini-3.1-flash-image")

# Which backend renders the try-on: "grafilab" or "gemini".
# Defaults to Grafilab when its key is present.
TRYON_PROVIDER = os.environ.get(
    "TRYON_PROVIDER", "grafilab" if GRAFILAB_API_KEY else "gemini"
).lower()

# --- Fit engine ------------------------------------------------------------
# How strongly the trained ML model nudges the size-chart ease (percentage
# points at full confidence: P(large) - P(small) = +/-1).
ML_EASE_SHIFT = float(os.environ.get("FLOWFIT_ML_EASE_SHIFT", "8"))

# --- Review feedback loop --------------------------------------------------
# Retrain automatically once the share of pending reviews that disagree with
# the system's verdict reaches this fraction ...
MISMATCH_THRESHOLD = float(os.environ.get("FLOWFIT_MISMATCH_THRESHOLD", "0.20"))
# ... and at least this many reviews are pending (avoids 1-of-3 triggers).
MIN_REVIEWS = int(os.environ.get("FLOWFIT_MIN_REVIEWS", "20"))
# Each review row is repeated this many times in the training set so a few
# hundred reviews can move a model trained on thousands of rows.
REVIEW_WEIGHT = int(os.environ.get("FLOWFIT_REVIEW_WEIGHT", "3"))
# New model is rejected if accuracy on the original hold-out drops by more
# than this (absolute).
MAX_ACCURACY_DROP = float(os.environ.get("FLOWFIT_MAX_ACCURACY_DROP", "0.03"))

FEEDBACK_DIR = Path(os.environ.get("FLOWFIT_FEEDBACK_DIR", BASE_DIR / "data" / "feedback"))
MODEL_VERSIONS_DIR = BASE_DIR / "models" / "versions"
