"""
Report Analyzer API routes
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional

from app.schemas import ReportAnalysisResponse, ErrorResponse
from app.services.analysis_service import ReportAnalysisService
from app.services.nlp_service import NLPService

router = APIRouter()

# Global service instance (will be initialized in main.py)
analysis_service = ReportAnalysisService()


@router.post("/upload", response_model=ReportAnalysisResponse)
async def analyze_report(
    file: UploadFile = File(...),
    extract_only: bool = Form(False)
):
    """
    Analyze uploaded medical report
    
    - **file**: Medical report (PDF, PNG, JPG, JPEG)
    - **extract_only**: If true, only extract text without analysis
    
    Returns analyzed biomarkers with educational information
    """
    try:
        # Validate file type
        file_extension = file.filename.split('.')[-1].lower()
        allowed_extensions = ['pdf', 'png', 'jpg', 'jpeg']
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Analyze report
        result = await analysis_service.analyze_report(
            file=file,
            extract_only=extract_only
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze report: {str(e)}"
        )


@router.post("/analyze-text", response_model=ReportAnalysisResponse)
async def analyze_text(text: str):
    """
    Analyze medical report from text input
    
    - **text**: Medical report text
    
    Returns analyzed biomarkers with educational information
    """
    try:
        if not text or len(text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Text is too short. Please provide valid medical report text."
            )
        
        # Analyze text
        result = await analysis_service.analyze_report(
            text=text,
            extract_only=False
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze text: {str(e)}"
        )


def set_nlp_service(nlp_service: NLPService):
    """Set NLP service for dependency injection"""
    analysis_service.set_nlp_service(nlp_service)
