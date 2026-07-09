"""
Configuration settings for the HealthDecode backend
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Server settings
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Alternative Vite port
        "http://localhost:5175",  # Alternative Vite port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://localhost:3000",  # Alternative port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    # File upload settings
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".png", ".jpg", ".jpeg"]
    UPLOAD_DIR: str = "uploads"
    
    # OCR settings
    TESSERACT_CMD: str = "tesseract"  # Will be auto-detected or set by user
    OCR_LANGUAGE: str = "eng"
    
    # NLP settings
    SPACY_MODEL: str = "en_core_web_sm"
    SPACY_MODEL_VERSION: str = "3.7.1"  # Compatible with spaCy 3.7.6
    
    # AI/ML settings
    USE_LOCAL_MODEL: bool = True
    MAX_SUMMARY_LENGTH: int = 150
    MIN_SUMMARY_LENGTH: int = 50
    
    # Knowledge base settings
    KNOWLEDGE_BASE_PATH: str = "app/data/knowledge_base.yaml"
    REFERENCE_RANGES_PATH: str = "app/data/reference_ranges.yaml"
    
    # Safety settings
    ENABLE_DIAGNOSIS: bool = False  # Always False - no diagnosis allowed
    ENABLE_TREATMENT: bool = False  # Always False - no treatment advice
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
