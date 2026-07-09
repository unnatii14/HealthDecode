"""
Report Analysis Service
Coordinates OCR, NLP, and knowledge base to analyze medical reports
"""

from typing import List, Dict, Optional
from fastapi import UploadFile, HTTPException

from app.services.ocr_service import OCRService
from app.services.nlp_service import NLPService
from app.services.knowledge_service import KnowledgeBaseService
from app.services.ai_service import AIService
from app.services.rag_service import RagService
from app.schemas import Biomarker, BiomarkerStatus, ReferenceRange
from app.config import settings


class ReportAnalysisService:
    """Service for comprehensive medical report analysis"""
    
    def __init__(self):
        """Initialize analysis service"""
        self.ocr_service = OCRService()
        self.nlp_service = None  # Will be injected
        self.knowledge_service = KnowledgeBaseService()
        self.ai_service = AIService()
        self.rag_service = RagService()
    
    def set_nlp_service(self, nlp_service: NLPService):
        """Set NLP service (dependency injection)"""
        self.nlp_service = nlp_service
    
    async def analyze_report(
        self, 
        file: Optional[UploadFile] = None,
        text: Optional[str] = None,
        extract_only: bool = False
    ) -> Dict:
        """
        Analyze medical report from file or text
        
        Args:
            file: Uploaded file (image or PDF)
            text: Direct text input (if no file)
            extract_only: Only extract text without analysis
            
        Returns:
            Dictionary with analysis results
        """
        # Step 1: Extract text if file provided
        if file:
            extracted_text = await self.ocr_service.extract_text_from_upload(file)
            
            # Validate if it looks like a medical report
            is_valid, message = self.ocr_service.validate_medical_report(extracted_text)
            if not is_valid:
                raise HTTPException(status_code=400, detail=message)
        elif text:
            extracted_text = text
        else:
            raise HTTPException(status_code=400, detail="Either file or text must be provided")
        
        # Return early if only extraction requested
        if extract_only:
            return {
                'success': True,
                'extracted_text': extracted_text,
                'biomarkers': [],
                'summary': None,
                'recommendations': []
            }
        
        # Step 2: Extract biomarkers using NLP
        if not self.nlp_service:
            raise HTTPException(status_code=500, detail="NLP service not initialized")
        
        raw_biomarkers = self._extract_biomarkers(extracted_text)

        # Step 3: Enrich each biomarker with status + a grounded explanation.
        biomarkers = []
        for raw_bio in raw_biomarkers:
            status = self.nlp_service.determine_status(
                raw_bio['value'],
                raw_bio['reference_range']
            )
            explanation, implications = self._explain(raw_bio, status)
            unit = raw_bio.get('unit') or raw_bio['reference_range'].get('unit', '')

            biomarker = Biomarker(
                name=raw_bio['name'],
                value=raw_bio['value'],
                unit=unit,
                reference_range=ReferenceRange(
                    min=raw_bio['reference_range']['min'],
                    max=raw_bio['reference_range']['max'],
                    unit=unit
                ),
                status=BiomarkerStatus(status),
                category=raw_bio['category'],
                explanation=explanation,
                implications=implications
            )
            biomarkers.append(biomarker)
        
        # Step 4: Generate summary
        summary = self._generate_summary(biomarkers)
        
        # Step 5: Generate recommendations
        recommendations = self._generate_recommendations(biomarkers)
        
        return {
            'success': True,
            'extracted_text': extracted_text,
            'biomarkers': [b.model_dump() for b in biomarkers],
            'summary': summary,
            'recommendations': recommendations,
            'disclaimer': self.knowledge_service.get_disclaimer()
        }
    
    def _extract_biomarkers(self, text: str) -> List[Dict]:
        """LLM extraction (enriched with reference ranges); regex fallback."""
        if settings.USE_AI_EXTRACTION and self.ai_service.available:
            try:
                enriched = []
                for item in self.ai_service.extract_biomarkers(text):
                    ref_info = self.nlp_service._find_reference_range(item["name"])
                    if not ref_info:
                        continue  # only keep biomarkers we have a reference range for
                    enriched.append({
                        "name": ref_info["name"],
                        "value": item["value"],
                        "unit": item.get("unit", "") or ref_info.get("unit", ""),
                        "category": ref_info.get("category", "Other"),
                        "reference_range": self.nlp_service._get_reference_range(ref_info),
                    })
                if enriched:
                    return enriched
            except Exception as exc:  # noqa: BLE001
                print(f"⚠️  AI extraction failed ({exc}); falling back to regex")
        return self.nlp_service.extract_biomarkers(text)

    def _explain(self, raw_bio: Dict, status: str):
        """RAG-grounded AI explanation; static knowledge-base fallback."""
        if settings.USE_AI_EXPLANATIONS and self.ai_service.available:
            try:
                context = self.rag_service.retrieve(raw_bio["name"])
                result = self.ai_service.explain_biomarker(
                    raw_bio["name"], raw_bio["value"], raw_bio.get("unit", ""), status, context
                )
                if result.get("explanation"):
                    return result["explanation"], result.get("implications", [])
            except Exception as exc:  # noqa: BLE001
                print(f"⚠️  AI explanation failed ({exc}); using knowledge base")
        explanation = self.knowledge_service.get_explanation_for_biomarker(raw_bio["name"], status)
        implications = self.knowledge_service.get_implications_for_biomarker(raw_bio["name"], status)
        return explanation, implications

    def _generate_summary(self, biomarkers: List[Biomarker]) -> str:
        """Generate a summary of the analysis"""
        if not biomarkers:
            return "No biomarkers were detected in the provided report. Please ensure the image is clear and contains medical test results."
        
        total = len(biomarkers)
        normal = sum(1 for b in biomarkers if b.status == BiomarkerStatus.NORMAL)
        low = sum(1 for b in biomarkers if b.status == BiomarkerStatus.LOW)
        high = sum(1 for b in biomarkers if b.status == BiomarkerStatus.HIGH)
        
        summary_parts = [
            f"Analysis of {total} biomarker{'s' if total != 1 else ''}:",
            f"• {normal} within normal range",
        ]
        
        if low > 0:
            summary_parts.append(f"• {low} below optimal range")
        if high > 0:
            summary_parts.append(f"• {high} above optimal range")
        
        # Highlight specific concerns
        concerns = []
        for b in biomarkers:
            if b.status == BiomarkerStatus.LOW:
                concerns.append(f"{b.name} (low)")
            elif b.status == BiomarkerStatus.HIGH:
                concerns.append(f"{b.name} (high)")
        
        if concerns:
            summary_parts.append(f"\nBiomarkers requiring attention: {', '.join(concerns[:3])}")
        else:
            summary_parts.append("\nAll analyzed biomarkers are within normal ranges.")
        
        return "\n".join(summary_parts)
    
    def _generate_recommendations(self, biomarkers: List[Biomarker]) -> List[str]:
        """Generate educational recommendations based on analysis"""
        recommendations = []
        
        # Check for deficiencies
        low_biomarkers = [b for b in biomarkers if b.status == BiomarkerStatus.LOW]
        
        if not biomarkers:
            return [
                "Ensure uploaded documents are clear and readable",
                "Medical reports should include biomarker names, values, and units",
                "Consider re-scanning the document with better lighting"
            ]
        
        if low_biomarkers:
            recommendations.append(
                "📋 Some biomarkers are below optimal range. Consider discussing with your healthcare provider."
            )
            
            # Specific vitamin/mineral recommendations
            for bio in low_biomarkers[:3]:  # Limit to top 3
                nutrient = self.knowledge_service.get_nutrient_by_id(
                    bio.name.lower().replace(' ', '-').replace('(', '').replace(')', '')
                )
                if nutrient:
                    sources = ', '.join(nutrient.sources[:3])
                    recommendations.append(
                        f"💡 For {bio.name}: Consider dietary sources like {sources}"
                    )
        else:
            recommendations.append(
                "✅ All analyzed biomarkers appear within normal ranges"
            )
        
        # General recommendations
        recommendations.extend([
            "🏥 Always consult healthcare professionals for medical interpretation",
            "📊 Keep track of your test results over time to monitor trends",
            "🥗 Maintain a balanced diet with varied nutrient sources",
            "💊 Do not start supplements without professional guidance"
        ])
        
        return recommendations
