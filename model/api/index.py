"""
FLOWFIT — Vercel API Entry Point

This file exposes the existing FastAPI application
to Vercel without changing the backend logic.
"""

from backend.main import app

# Vercel uses this ASGI application
# as the serverless API entry point.