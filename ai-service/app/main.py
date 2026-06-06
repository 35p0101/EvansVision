import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.predict_controller import router

app = FastAPI(
    title="EvansVision AI Service",
    description="AI-powered football match prediction engine",
    version="1.0.0",
)

# CORS configurabile via env var (separato da virgola). Default chiuso al backend.
_allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:4000,http://backend:4000")
ALLOWED_ORIGINS = [o.strip() for o in _allowed.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "service": "EvansVision AI",
        "version": "1.0.0",
        "status": "operational",
    }
