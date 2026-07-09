"""
Knowledge Explorer API routes
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List

from app.schemas import (
    NutrientInfo, 
    NutrientCategory, 
    KnowledgeSearchResponse
)
from app.services.knowledge_service import KnowledgeBaseService

router = APIRouter()

# Initialize service
knowledge_service = KnowledgeBaseService()


@router.get("/nutrients", response_model=List[NutrientInfo])
async def get_all_nutrients():
    """
    Get all available nutrients in the knowledge base
    
    Returns list of all nutrients with complete information
    """
    try:
        nutrients = knowledge_service.get_all_nutrients()
        return nutrients
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch nutrients: {str(e)}"
        )


@router.get("/nutrients/{nutrient_id}", response_model=NutrientInfo)
async def get_nutrient(nutrient_id: str):
    """
    Get detailed information about a specific nutrient
    
    - **nutrient_id**: Nutrient identifier (e.g., 'vitamin-d', 'iron')
    """
    try:
        nutrient = knowledge_service.get_nutrient_by_id(nutrient_id)
        
        if not nutrient:
            raise HTTPException(
                status_code=404,
                detail=f"Nutrient '{nutrient_id}' not found"
            )
        
        return nutrient
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch nutrient: {str(e)}"
        )


@router.get("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    category: Optional[NutrientCategory] = Query(None, description="Filter by category")
):
    """
    Search the knowledge base
    
    - **q**: Search query (searches in name, description, symptoms, benefits)
    - **category**: Optional filter by vitamin or mineral
    
    Returns matching nutrients
    """
    try:
        results = knowledge_service.search_nutrients(q, category)
        
        return {
            'success': True,
            'results': results,
            'total_count': len(results)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/categories/{category}", response_model=List[NutrientInfo])
async def get_by_category(category: NutrientCategory):
    """
    Get all nutrients in a specific category
    
    - **category**: 'vitamin' or 'mineral'
    """
    try:
        nutrients = knowledge_service.get_nutrients_by_category(category)
        return nutrients
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch category: {str(e)}"
        )


@router.get("/disclaimer")
async def get_disclaimer():
    """Get the standard medical disclaimer"""
    try:
        return {
            'disclaimer': knowledge_service.get_disclaimer()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch disclaimer: {str(e)}"
        )
