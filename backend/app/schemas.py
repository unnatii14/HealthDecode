"""
Pydantic models for API request/response schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class BiomarkerStatus(str, Enum):
    """Status of a biomarker"""
    NORMAL = "normal"
    LOW = "low"
    HIGH = "high"
    UNKNOWN = "unknown"


class ReferenceRange(BaseModel):
    """Reference range for a biomarker"""
    min: float
    max: float
    unit: str


class Biomarker(BaseModel):
    """Biomarker information from report"""
    name: str = Field(..., description="Name of the biomarker")
    value: float = Field(..., description="Measured value")
    unit: str = Field(..., description="Unit of measurement")
    reference_range: ReferenceRange = Field(..., description="Normal reference range")
    status: BiomarkerStatus = Field(..., description="Status relative to reference range")
    category: str = Field(..., description="Category (e.g., Vitamins, Minerals)")
    explanation: str = Field(..., description="Educational explanation of the biomarker")
    implications: List[str] = Field(..., description="What this result might mean")


class ReportAnalysisRequest(BaseModel):
    """Request for report analysis"""
    extract_text_only: bool = Field(False, description="Only extract text without analysis")


class ReportAnalysisResponse(BaseModel):
    """Response from report analysis"""
    success: bool
    extracted_text: Optional[str] = None
    biomarkers: List[Biomarker] = []
    summary: Optional[str] = None
    recommendations: List[str] = []
    disclaimer: str = Field(
        default="This is educational information only. Always consult healthcare professionals for medical advice.",
        description="Legal disclaimer"
    )


class NutrientCategory(str, Enum):
    """Category of nutrient"""
    VITAMIN = "vitamin"
    MINERAL = "mineral"
    OTHER = "other"


class NutrientInfo(BaseModel):
    """Detailed nutrient information"""
    id: str
    name: str
    category: NutrientCategory
    description: str
    benefits: List[str]
    deficiency_symptoms: List[str]
    sources: List[str]
    reference_range: str
    daily_requirement: str
    color: str = "from-blue-400 to-blue-600"


class KnowledgeSearchRequest(BaseModel):
    """Request for knowledge base search"""
    query: str = Field(..., min_length=1, max_length=200)
    category: Optional[NutrientCategory] = None


class KnowledgeSearchResponse(BaseModel):
    """Response from knowledge base search"""
    success: bool
    results: List[NutrientInfo]
    total_count: int


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    services: Dict[str, bool]
    version: str = "1.0.0"


class ErrorResponse(BaseModel):
    """Error response"""
    success: bool = False
    error: str
    detail: Optional[str] = None
