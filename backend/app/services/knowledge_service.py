"""
Knowledge Base Service
Manages access to verified medical knowledge
"""

import yaml
from typing import List, Dict, Optional

from app.config import settings
from app.schemas import NutrientInfo, NutrientCategory


class KnowledgeBaseService:
    """Service for accessing medical knowledge base"""
    
    def __init__(self):
        """Initialize knowledge base service"""
        self.knowledge_data = None
        self.nutrients = []
        self._load_knowledge_base()
    
    def _load_knowledge_base(self):
        """Load knowledge base from YAML file"""
        try:
            with open(settings.KNOWLEDGE_BASE_PATH, 'r', encoding='utf-8') as f:
                self.knowledge_data = yaml.safe_load(f)
                
            # Parse nutrients
            for nutrient_data in self.knowledge_data.get('nutrients', []):
                nutrient = NutrientInfo(
                    id=nutrient_data['id'],
                    name=nutrient_data['name'],
                    category=NutrientCategory(nutrient_data['category']),
                    description=nutrient_data['description'],
                    benefits=nutrient_data['benefits'],
                    deficiency_symptoms=nutrient_data['deficiency_symptoms'],
                    sources=nutrient_data['sources'],
                    reference_range=nutrient_data['reference_range'],
                    daily_requirement=nutrient_data['daily_requirement'],
                    color=self._get_color_for_nutrient(nutrient_data['id'])
                )
                self.nutrients.append(nutrient)
                
            print(f"✅ Loaded {len(self.nutrients)} nutrients from knowledge base")
            
        except Exception as e:
            print(f"❌ Failed to load knowledge base: {e}")
            self.nutrients = []
    
    def _get_color_for_nutrient(self, nutrient_id: str) -> str:
        """Get gradient color for nutrient"""
        color_map = {
            'vitamin-d': 'from-yellow-400 to-orange-500',
            'vitamin-b12': 'from-blue-400 to-purple-500',
            'iron': 'from-red-400 to-pink-500',
            'vitamin-b9': 'from-green-400 to-emerald-500',
            'calcium': 'from-gray-400 to-slate-500',
            'magnesium': 'from-teal-400 to-cyan-500',
        }
        return color_map.get(nutrient_id, 'from-blue-400 to-blue-600')
    
    def get_all_nutrients(self) -> List[NutrientInfo]:
        """Get all nutrients"""
        return self.nutrients
    
    def get_nutrient_by_id(self, nutrient_id: str) -> Optional[NutrientInfo]:
        """Get nutrient by ID"""
        for nutrient in self.nutrients:
            if nutrient.id == nutrient_id:
                return nutrient
        return None
    
    def search_nutrients(self, query: str, category: Optional[NutrientCategory] = None) -> List[NutrientInfo]:
        """
        Search nutrients by query string
        
        Args:
            query: Search query
            category: Optional category filter
            
        Returns:
            List of matching nutrients
        """
        query_lower = query.lower()
        results = []
        
        for nutrient in self.nutrients:
            # Filter by category if specified
            if category and nutrient.category != category:
                continue
            
            # Search in name, description, and symptoms
            if (query_lower in nutrient.name.lower() or
                query_lower in nutrient.description.lower() or
                any(query_lower in symptom.lower() for symptom in nutrient.deficiency_symptoms) or
                any(query_lower in benefit.lower() for benefit in nutrient.benefits)):
                results.append(nutrient)
        
        return results
    
    def get_nutrients_by_category(self, category: NutrientCategory) -> List[NutrientInfo]:
        """Get all nutrients in a category"""
        return [n for n in self.nutrients if n.category == category]
    
    def get_explanation_for_biomarker(self, biomarker_name: str, status: str) -> str:
        """
        Get educational explanation for a biomarker based on its status
        
        Args:
            biomarker_name: Name of the biomarker
            status: 'normal', 'low', or 'high'
            
        Returns:
            Educational explanation text
        """
        # Try to find matching nutrient
        for nutrient in self.nutrients:
            if biomarker_name.lower() in nutrient.name.lower():
                if status == 'normal':
                    return f"{nutrient.name} is within normal range. {nutrient.description}"
                elif status == 'low':
                    return f"{nutrient.name} is below optimal range. {nutrient.description}"
                elif status == 'high':
                    return f"{nutrient.name} is above optimal range. {nutrient.description}"
        
        # Default explanations
        if status == 'normal':
            return f"{biomarker_name} is within the normal reference range, indicating healthy levels."
        elif status == 'low':
            return f"{biomarker_name} is below the normal reference range. This may indicate deficiency."
        else:
            return f"{biomarker_name} is above the normal reference range. This may require attention."
    
    def get_implications_for_biomarker(self, biomarker_name: str, status: str) -> List[str]:
        """
        Get implications for a biomarker based on its status
        
        Returns:
            List of implication strings
        """
        # Try to find matching nutrient
        for nutrient in self.nutrients:
            if biomarker_name.lower() in nutrient.name.lower():
                if status == 'low':
                    implications = []
                    # Add deficiency symptoms as implications
                    implications.extend(nutrient.deficiency_symptoms[:4])
                    implications.append(f"Consider foods rich in {nutrient.name}")
                    return implications
                elif status == 'normal':
                    return [
                        f"Adequate {nutrient.name} supports health",
                        "Continue balanced diet",
                        "Maintain current intake levels",
                        "No immediate concerns"
                    ]
                elif status == 'high':
                    return [
                        "Levels are higher than normal",
                        "May need to review supplementation",
                        "Consult healthcare provider",
                        "Monitor in future tests"
                    ]
        
        # Default implications
        if status == 'low':
            return [
                "Below optimal range",
                "May need dietary adjustments",
                "Consider consulting healthcare provider",
                "Monitor in future tests"
            ]
        elif status == 'normal':
            return [
                "Within healthy range",
                "No immediate concerns",
                "Continue healthy lifestyle",
                "Maintain current intake"
            ]
        else:
            return [
                "Above optimal range",
                "May need to review intake",
                "Consult healthcare provider",
                "Monitor in future tests"
            ]
    
    def get_disclaimer(self) -> str:
        """Get standard disclaimer"""
        return self.knowledge_data.get('disclaimer', 
            "This is educational information only. Always consult healthcare professionals for medical advice.")
