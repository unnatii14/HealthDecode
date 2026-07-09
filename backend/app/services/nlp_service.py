"""
NLP Service using spaCy
Handles text parsing, biomarker extraction, and natural language understanding
"""

import re
from typing import List, Dict, Optional, Tuple
import yaml

# Try to import spaCy, but work without it if not available
try:
    import spacy
    from spacy.matcher import Matcher
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    print("⚠️  spaCy not available. Using fallback text processing.")

from app.config import settings


class NLPService:
    """Service for NLP-based text analysis and biomarker extraction"""
    
    def __init__(self):
        """Initialize NLP service"""
        self.nlp = None
        self.matcher = None
        self.reference_ranges = None
        
    async def initialize(self):
        """Load spaCy model and reference ranges"""
        try:
            # Try to load spaCy model if available
            if SPACY_AVAILABLE:
                try:
                    self.nlp = spacy.load(settings.SPACY_MODEL)
                    print(f"✅ Loaded spaCy model: {settings.SPACY_MODEL}")
                except OSError:
                    print(f"⚠️  spaCy model '{settings.SPACY_MODEL}' not found.")
                    print("   Download it with: python -m spacy download en_core_web_sm")
                    # Use blank model as fallback
                    self.nlp = spacy.blank("en")
                    print("   Using blank spaCy model as fallback")
                
                # Initialize matcher
                self.matcher = Matcher(self.nlp.vocab)
                self._setup_patterns()
            else:
                print("   Using regex-based text processing (spaCy not installed)")
            
            # Load reference ranges
            self._load_reference_ranges()
            
            print("✅ NLP Service initialized successfully")
            
        except Exception as e:
            print(f"❌ Failed to initialize NLP service: {e}")
            raise
    
    def _setup_patterns(self):
        """Setup spaCy matcher patterns for biomarker extraction"""
        # Pattern for biomarker values: "Name: 123.45 unit"
        # This will be used alongside regex for robust extraction
        pass
    
    def _load_reference_ranges(self):
        """Load reference ranges from YAML file"""
        try:
            with open(settings.REFERENCE_RANGES_PATH, 'r') as f:
                data = yaml.safe_load(f)
                self.reference_ranges = {
                    item['name']: item for item in data['biomarkers']
                }
                # Also index by aliases
                for item in data['biomarkers']:
                    if 'aliases' in item:
                        for alias in item['aliases']:
                            self.reference_ranges[alias] = item
                            
            print(f"✅ Loaded {len(data['biomarkers'])} reference ranges")
        except Exception as e:
            print(f"❌ Failed to load reference ranges: {e}")
            self.reference_ranges = {}
    
    def extract_biomarkers(self, text: str) -> List[Dict]:
        """
        Extract biomarkers from medical report text
        
        Returns:
            List of dictionaries with biomarker information
        """
        biomarkers = []
        
        # Common patterns for medical reports
        patterns = [
            # Pattern: "Name 123.45 unit"
            r'([A-Za-z][A-Za-z0-9\s\(\)\-]+?)\s+(\d+\.?\d*)\s*([a-zA-Z/%]+)',
            # Pattern: "Name: 123.45 unit"
            r'([A-Za-z][A-Za-z0-9\s\(\)\-]+?)\s*:\s*(\d+\.?\d*)\s*([a-zA-Z/%]+)',
            # Pattern: "Name (unit): 123.45"
            r'([A-Za-z][A-Za-z0-9\s\(\)\-]+?)\s*\(([a-zA-Z/%]+)\)\s*:\s*(\d+\.?\d*)',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                if len(match.groups()) == 3:
                    if pattern.endswith(r'(\d+\.?\d*)'):
                        # Pattern 3: Name (unit): value
                        name, unit, value = match.groups()
                    else:
                        # Pattern 1 & 2: Name value unit
                        name, value, unit = match.groups()
                    
                    name = name.strip()
                    
                    # Skip if name is too short or too long
                    if len(name) < 3 or len(name) > 50:
                        continue
                    
                    # Skip if name contains mostly numbers
                    if sum(c.isdigit() for c in name) > len(name) / 2:
                        continue
                    
                    # Try to find reference range
                    ref_info = self._find_reference_range(name)
                    
                    if ref_info:
                        biomarker = {
                            'name': ref_info['name'],
                            'value': float(value),
                            'unit': unit.strip(),
                            'category': ref_info.get('category', 'Other'),
                            'reference_range': self._get_reference_range(ref_info)
                        }
                        
                        # Check if already added (avoid duplicates)
                        if not any(b['name'] == biomarker['name'] for b in biomarkers):
                            biomarkers.append(biomarker)
        
        return biomarkers
    
    def _find_reference_range(self, name: str) -> Optional[Dict]:
        """Find reference range for a biomarker by name or alias"""
        if not self.reference_ranges:
            return None
        
        # Direct lookup
        if name in self.reference_ranges:
            return self.reference_ranges[name]
        
        # Case-insensitive lookup
        name_lower = name.lower()
        for ref_name, ref_info in self.reference_ranges.items():
            if ref_name.lower() == name_lower:
                return ref_info
        
        # Partial match
        for ref_name, ref_info in self.reference_ranges.items():
            if name_lower in ref_name.lower() or ref_name.lower() in name_lower:
                return ref_info
        
        return None
    
    def _get_reference_range(self, ref_info: Dict) -> Dict:
        """Extract min/max from reference range info"""
        # Try to get range, male_range, or female_range
        if 'range' in ref_info:
            min_val, max_val = ref_info['range']
        elif 'male_range' in ref_info:
            min_val, max_val = ref_info['male_range']
        elif 'female_range' in ref_info:
            min_val, max_val = ref_info['female_range']
        elif 'normal' in ref_info:
            min_val, max_val = ref_info['normal']
        else:
            # No clear range, use a wide default
            min_val, max_val = 0, 999999
        
        return {
            'min': float(min_val),
            'max': float(max_val),
            'unit': ref_info.get('unit', '')
        }
    
    def determine_status(self, value: float, ref_range: Dict) -> str:
        """
        Determine if a biomarker value is normal, low, or high
        
        Returns:
            'normal', 'low', or 'high'
        """
        min_val = ref_range['min']
        max_val = ref_range['max']
        
        if value < min_val:
            return 'low'
        elif value > max_val:
            return 'high'
        else:
            return 'normal'
    
    def analyze_text_for_symptoms(self, text: str) -> List[str]:
        """
        Analyze text for mentioned symptoms or concerns
        
        Returns:
            List of detected symptoms
        """
        if not SPACY_AVAILABLE or not self.nlp:
            return []
        
        doc = self.nlp(text.lower())
        
        # Common symptom keywords
        symptom_keywords = [
            'fatigue', 'tired', 'weakness', 'pain', 'ache',
            'dizzy', 'nausea', 'headache', 'fever', 'cough',
            'shortness of breath', 'chest pain'
        ]
        
        found_symptoms = []
        for keyword in symptom_keywords:
            if keyword in text.lower():
                found_symptoms.append(keyword.title())
        
        return found_symptoms
    
    def extract_dates(self, text: str) -> List[str]:
        """Extract dates from text"""
        # Simple date patterns
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
            r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',
        ]
        
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            dates.extend(matches)
        
        return dates
