"""
Health check routes
"""

from fastapi import APIRouter
from app.schemas import HealthCheckResponse

router = APIRouter()


@router.get("/", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "ocr": True,
            "nlp": True,
            "knowledge_base": True
        },
        "version": "1.0.0"
    }
