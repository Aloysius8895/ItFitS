"""Vercel entry point: the ItFitS backend (model/backend) served under /api."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "model"))

from backend.main import app  # noqa: E402,F401  (Vercel loads `app`)
