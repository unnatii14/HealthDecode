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


# ─── Flexible Separator and Value Patterns ─────────────────────────────────────
# Matches: colon, space, tab, dash, equals, pipe — common in Indian lab reports
_SEP = r'[\s:=\-|]*'
# Value: numeric with optional decimal
_VAL = r'(\d+\.?\d*)'
# Lookahead: value appearing within 200 chars (handles tabular reports)
_AHEAD = r'.{0,200}?'


# Extended biomarker pattern database — covers Indian lab report formats
# Pattern groups: (name, value, unit) where value is always a capture group
_BIOMARKER_PATTERNS = [
    # ── Blood Sugar / Diabetes ────────────────────────────────────────────────
    (r'(?:fasting\s*(?:blood\s*)?(?:glucose|sugar)|fbs|fasting\s*blood\s*sugar|fbg)', 'Fasting Glucose'),
    (r'(?:random\s*(?:blood\s*)?(?:glucose|sugar)|rbs|post\s*prandial|pp\s*blood\s*sugar)', 'Random Blood Sugar'),
    (r'(?:hba1c|hemoglobin\s*a1c|glycated\s*hemoglobin|glyco(?:sylated)?\s*hemoglobin|a1c)', 'HbA1c'),

    # ── Lipid Profile ──────────────────────────────────────────────────────────
    (r'(?:total\s*cholesterol|s\.?\s*cholesterol|serum\s*cholesterol|t\.?\s*chol(?:esterol)?)', 'Total Cholesterol'),
    (r'(?:ldl\s*cholesterol|ldl\s*chol(?:esterol)?|low\s*density\s*lipoprotein|ldl-c)', 'LDL Cholesterol'),
    (r'(?:hdl\s*cholesterol|hdl\s*chol(?:esterol)?|high\s*density\s*lipoprotein|hdl-c)', 'HDL Cholesterol'),
    (r'(?:triglycerides?|tg\b|serum\s*triglycerides?|trigs?)', 'Triglycerides'),
    (r'(?:vldl|very\s*low\s*density\s*lipoprotein|vldl\s*chol(?:esterol)?)', 'VLDL Cholesterol'),

    # ── Liver Function ─────────────────────────────────────────────────────────
    (r'(?:sgpt|alt|alanine\s*(?:amino)?trans(?:ferase|aminase)|alanine\s*transaminase)', 'ALT'),
    (r'(?:sgot|ast|aspartate\s*(?:amino)?trans(?:ferase|aminase)|aspartate\s*transaminase)', 'AST'),
    (r'(?:alkaline\s*phosphatase|alp\b)', 'Alkaline Phosphatase'),
    (r'(?:ggt|gamma\s*gt|gamma\s*glutamyl\s*(?:transferase|transpeptidase))', 'GGT'),
    (r'(?:total\s*bilirubin|bilirubin\s*total|t\.?\s*bili(?:rubin)?)', 'Bilirubin Total'),
    (r'(?:direct\s*bilirubin|d\.?\s*bili(?:rubin)?|conjugated\s*bilirubin)', 'Direct Bilirubin'),
    (r'(?:albumin|serum\s*albumin|s\.?\s*albumin)', 'Albumin'),
    (r'(?:total\s*protein|serum\s*total\s*protein|t\.?\s*protein)', 'Total Protein'),

    # ── Kidney Function ────────────────────────────────────────────────────────
    (r'(?:s\.?\s*creatinine|sr\.?\s*creatinine|serum\s*creatinine|creatinine)', 'Creatinine'),
    (r'(?:blood\s*urea\s*nitrogen|bun\b|b\.?u\.?n\.?)', 'BUN'),
    (r'(?:blood\s*urea|serum\s*urea|s\.?\s*urea|urea\b(?!\s*nitrogen))', 'BUN'),
    (r'(?:uric\s*acid|s\.?\s*uric\s*acid|serum\s*uric\s*acid)', 'Uric Acid'),
    (r'(?:egfr|estimated\s*gfr|glomerular\s*filtration\s*rate)', 'eGFR'),

    # ── CBC ────────────────────────────────────────────────────────────────────
    (r'(?:hemoglobin|haemoglobin|hb\b|hgb\b|hb%|hgb%)', 'Hemoglobin'),
    (r'(?:hematocrit|pcv|packed\s*cell\s*volume|hct\b)', 'Hematocrit'),
    (r'(?:rbc\s*count|red\s*blood\s*cell\s*count|erythrocyte\s*count|rbc\b)', 'RBC Count'),
    (r'(?:wbc\s*count|white\s*blood\s*cell(?:\s*count)?|leukocyte\s*count|tlc\b|total\s*leukocyte\s*count)', 'White Blood Cells'),
    (r'(?:platelet\s*count|platelets|plt\b|thrombocyte\s*count)', 'Platelets'),
    (r'(?:mcv\b|mean\s*corpuscular\s*volume)', 'MCV'),
    (r'(?:mch\b|mean\s*corpuscular\s*hemoglobin(?!\s*concentration))', 'MCH'),
    (r'(?:mchc\b|mean\s*corpuscular\s*hemoglobin\s*concentration)', 'MCHC'),
    (r'(?:neutrophils?|neut(?:rophil)?s?\b)', 'Neutrophils'),
    (r'(?:lymphocytes?|lympho(?:cyte)?s?\b)', 'Lymphocytes'),
    (r'(?:eosinophils?|eosino(?:phil)?s?\b)', 'Eosinophils'),
    (r'(?:monocytes?|mono(?:cyte)?s?\b)', 'Monocytes'),
    (r'(?:basophils?|baso(?:phil)?s?\b)', 'Basophils'),

    # ── Thyroid ────────────────────────────────────────────────────────────────
    (r'(?:tsh\b|thyroid\s*stimulating\s*hormone|thyrotropin)', 'TSH'),
    (r'(?:free\s*t3|ft3\b|triiodothyronine(?:\s*free)?)', 'Free T3'),
    (r'(?:free\s*t4|ft4\b|thyroxine(?:\s*free)?)', 'Free T4'),

    # ── Vitamins ───────────────────────────────────────────────────────────────
    (r'(?:25\s*-?\s*oh\s*vitamin\s*d|vitamin\s*d\s*3?|vit\s*d\s*3?|25-hydroxy(?:vitamin|cholecalciferol)|cholecalciferol)', 'Vitamin D'),
    (r'(?:vitamin\s*b\s*-?12|vit\s*b\s*-?12|cobalamin|cyanocobalamin)', 'Vitamin B12'),
    (r'(?:folate|folic\s*acid|vitamin\s*b9|pteroylglutamic)', 'Folate'),
    (r'(?:serum\s*iron|s\.?\s*iron|iron\s*(?:level|serum)?)', 'Iron'),
    (r'(?:ferritin|s\.?\s*ferritin|serum\s*ferritin)', 'Ferritin'),

    # ── Minerals / Electrolytes ────────────────────────────────────────────────
    (r'(?:serum\s*calcium|s\.?\s*calcium|calcium\b)', 'Calcium'),
    (r'(?:serum\s*phosphorus|s\.?\s*phosphorus|phosphate|phosphorus)', 'Phosphorus'),
    (r'(?:serum\s*magnesium|s\.?\s*magnesium|magnesium\b)', 'Magnesium'),
    (r'(?:serum\s*sodium|s\.?\s*sodium|sodium\b|na\b)', 'Sodium'),
    (r'(?:serum\s*potassium|s\.?\s*potassium|potassium\b)', 'Potassium'),
    (r'(?:serum\s*chloride|s\.?\s*chloride|chloride\b)', 'Chloride'),
    (r'(?:bicarbonate|hco3\b|bicarb\b)', 'Bicarbonate'),
    (r'(?:serum\s*zinc|s\.?\s*zinc|zinc\b)', 'Zinc'),
]

# Compile patterns — each tries to capture the value within 200 chars of label
_COMPILED_PATTERNS: List[Tuple[re.Pattern, str]] = []
for _label_regex, _bio_name in _BIOMARKER_PATTERNS:
    # Forward: label ... value
    _pat = re.compile(
        rf'(?:{_label_regex}){_AHEAD}{_VAL}',
        re.IGNORECASE | re.DOTALL
    )
    _COMPILED_PATTERNS.append((_pat, _bio_name))


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
        # Used alongside regex for robust extraction
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
        Extract biomarkers from medical report text using extended pattern matching.
        Handles Indian lab formats: S. Creatinine, Sr. Cholesterol, Hb%, tabular etc.

        Returns:
            List of dictionaries with biomarker information
        """
        biomarkers = []
        seen_names = set()

        # Normalize text — collapse spaces but preserve newlines for line-based matching
        normalized = re.sub(r'[^\S\n]+', ' ', text)
        # Also create single-line version for fallback
        single_line = re.sub(r'\s+', ' ', text)

        for compiled_pattern, bio_name in _COMPILED_PATTERNS:
            match = compiled_pattern.search(normalized) or compiled_pattern.search(single_line)
            if not match:
                continue

            value_str = match.group(1)
            if not value_str:
                continue

            try:
                value = float(value_str)
            except ValueError:
                continue

            if value <= 0 or value > 999999:
                continue

            # Try to find reference range info
            ref_info = self._find_reference_range(bio_name)
            if not ref_info:
                continue

            canonical_name = ref_info['name']
            if canonical_name in seen_names:
                continue
            seen_names.add(canonical_name)

            ref_range = self._get_reference_range(ref_info)
            biomarkers.append({
                'name': canonical_name,
                'value': value,
                'unit': ref_info.get('unit', ''),
                'category': ref_info.get('category', 'Other'),
                'reference_range': ref_range
            })

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
        elif 'optimal' in ref_info:
            min_val, max_val = ref_info['optimal']
        else:
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
