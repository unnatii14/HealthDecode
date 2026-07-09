"""
HealthDecode Backend API
A modular FastAPI application for medical report analysis and health knowledge exploration.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from app.routes import analyzer, knowledge, health
from app.services.nlp_service import NLPService
from app.config import settings

# Global service instances
nlp_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    global nlp_service
    print("🚀 Initializing HealthDecode Backend...")
    
    # Initialize NLP service
    nlp_service = NLPService()
    await nlp_service.initialize()
    
    # Inject NLP service into analyzer routes
    analyzer.set_nlp_service(nlp_service)
    
    print("✅ All services initialized successfully")
    yield
    
    # Cleanup on shutdown
    print("🔄 Shutting down services...")


# Create FastAPI app
app = FastAPI(
    title="HealthDecode API",
    description="Medical literacy platform backend for report analysis and health education",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analyzer.router, prefix="/api/analyzer", tags=["Report Analyzer"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge Explorer"])
app.include_router(health.router, prefix="/api/health", tags=["Health Check"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "HealthDecode API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "healthy"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "nlp": nlp_service is not None,
            "ocr": True,
            "knowledge_base": True
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
