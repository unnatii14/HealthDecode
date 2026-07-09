export interface Nutrient {
  id: string;
  name: string;
  category: string;
  description: string;
  benefits: string[];
  sources: string[];
  deficiency_symptoms: string[];
  daily_requirement: string;
}

export const KNOWLEDGE_BASE: Nutrient[] = [
  {
    id: '1',
    name: 'Vitamin D',
    category: 'Vitamins',
    description: 'Essential fat-soluble vitamin that plays crucial roles in calcium absorption, bone health, immune function, and mood regulation.',
    benefits: [
      'Promotes calcium absorption for strong bones',
      'Supports immune system function',
      'Reduces inflammation',
      'May improve mood and reduce depression',
      'Helps maintain healthy muscle function'
    ],
    sources: [
      'Sunlight exposure (10-30 minutes daily)',
      'Fatty fish (salmon, mackerel, sardines)',
      'Egg yolks',
      'Fortified milk and cereals',
      'Mushrooms exposed to UV light'
    ],
    deficiency_symptoms: [
      'Bone pain and muscle weakness',
      'Frequent infections',
      'Fatigue and tiredness',
      'Depression',
      'Impaired wound healing'
    ],
    daily_requirement: '600-800 IU (15-20 mcg) for adults'
  },
  {
    id: '2',
    name: 'Iron',
    category: 'Minerals',
    description: 'Essential mineral crucial for producing hemoglobin, which carries oxygen in your blood to all body tissues.',
    benefits: [
      'Prevents anemia',
      'Boosts energy levels',
      'Improves athletic performance',
      'Enhances immune function',
      'Supports cognitive function'
    ],
    sources: [
      'Red meat and poultry',
      'Seafood',
      'Beans and lentils',
      'Dark leafy greens (spinach, kale)',
      'Fortified cereals and grains'
    ],
    deficiency_symptoms: [
      'Extreme fatigue',
      'Pale skin',
      'Shortness of breath',
      'Dizziness',
      'Cold hands and feet',
      'Brittle nails'
    ],
    daily_requirement: '8 mg for men, 18 mg for women (adult)'
  },
  {
    id: '3',
    name: 'Vitamin B12',
    category: 'Vitamins',
    description: 'Water-soluble vitamin essential for nerve function, DNA synthesis, and red blood cell formation.',
    benefits: [
      'Prevents anemia',
      'Supports nerve health',
      'Boosts energy levels',
      'Improves mood',
      'Supports bone health'
    ],
    sources: [
      'Meat (especially liver)',
      'Fish and shellfish',
      'Dairy products',
      'Eggs',
      'Fortified cereals and nutritional yeast'
    ],
    deficiency_symptoms: [
      'Fatigue and weakness',
      'Constipation',
      'Loss of appetite',
      'Numbness and tingling in hands/feet',
      'Memory problems',
      'Depression'
    ],
    daily_requirement: '2.4 mcg for adults'
  },
  {
    id: '4',
    name: 'Calcium',
    category: 'Minerals',
    description: 'Most abundant mineral in the body, essential for bone health, muscle function, nerve signaling, and heart health.',
    benefits: [
      'Builds and maintains strong bones',
      'Prevents osteoporosis',
      'Supports muscle contraction',
      'Enables nerve signal transmission',
      'Helps blood clotting'
    ],
    sources: [
      'Dairy products (milk, cheese, yogurt)',
      'Leafy green vegetables',
      'Fortified plant milk',
      'Tofu',
      'Sardines and salmon with bones'
    ],
    deficiency_symptoms: [
      'Weak and brittle bones',
      'Muscle cramps',
      'Numbness in fingers',
      'Abnormal heart rhythms',
      'Dental problems'
    ],
    daily_requirement: '1000-1200 mg for adults'
  },
  {
    id: '5',
    name: 'Omega-3 Fatty Acids',
    category: 'Fatty Acids',
    description: 'Essential fats that your body cannot produce, crucial for brain health, heart health, and reducing inflammation.',
    benefits: [
      'Reduces inflammation',
      'Lowers heart disease risk',
      'Supports brain health and memory',
      'May reduce depression and anxiety',
      'Promotes eye health'
    ],
    sources: [
      'Fatty fish (salmon, mackerel, sardines)',
      'Flaxseeds and chia seeds',
      'Walnuts',
      'Fish oil supplements',
      'Algae oil (vegetarian source)'
    ],
    deficiency_symptoms: [
      'Dry skin',
      'Poor concentration',
      'Joint pain',
      'Fatigue',
      'Poor circulation'
    ],
    daily_requirement: '250-500 mg combined EPA and DHA'
  },
  {
    id: '6',
    name: 'Magnesium',
    category: 'Minerals',
    description: 'Mineral involved in over 300 biochemical reactions, essential for muscle and nerve function, blood sugar control, and blood pressure regulation.',
    benefits: [
      'Supports muscle and nerve function',
      'Regulates blood sugar levels',
      'Maintains healthy blood pressure',
      'Supports bone health',
      'Reduces migraine frequency'
    ],
    sources: [
      'Nuts and seeds',
      'Whole grains',
      'Leafy green vegetables',
      'Legumes',
      'Dark chocolate'
    ],
    deficiency_symptoms: [
      'Muscle cramps and spasms',
      'Fatigue',
      'Irregular heartbeat',
      'Numbness and tingling',
      'Mood changes'
    ],
    daily_requirement: '310-420 mg for adults'
  },
  {
    id: '7',
    name: 'Vitamin C',
    category: 'Vitamins',
    description: 'Powerful antioxidant vitamin essential for immune function, collagen production, and iron absorption.',
    benefits: [
      'Boosts immune system',
      'Promotes wound healing',
      'Acts as antioxidant',
      'Enhances iron absorption',
      'Supports healthy skin'
    ],
    sources: [
      'Citrus fruits',
      'Berries',
      'Bell peppers',
      'Broccoli',
      'Tomatoes'
    ],
    deficiency_symptoms: [
      'Easy bruising',
      'Slow wound healing',
      'Bleeding gums',
      'Frequent infections',
      'Dry skin'
    ],
    daily_requirement: '75-90 mg for adults'
  },
  {
    id: '8',
    name: 'Zinc',
    category: 'Minerals',
    description: 'Trace mineral essential for immune function, wound healing, DNA synthesis, and protein production.',
    benefits: [
      'Strengthens immune system',
      'Accelerates wound healing',
      'Supports growth and development',
      'Maintains sense of taste and smell',
      'May reduce duration of common cold'
    ],
    sources: [
      'Oysters and shellfish',
      'Red meat',
      'Poultry',
      'Beans and nuts',
      'Whole grains'
    ],
    deficiency_symptoms: [
      'Impaired immune function',
      'Hair loss',
      'Diarrhea',
      'Loss of appetite',
      'Slow wound healing'
    ],
    daily_requirement: '8-11 mg for adults'
  },
  {
    id: '9',
    name: 'Folate (Vitamin B9)',
    category: 'Vitamins',
    description: 'B vitamin crucial for DNA synthesis, cell division, and preventing neural tube defects during pregnancy.',
    benefits: [
      'Prevents birth defects',
      'Supports red blood cell formation',
      'Aids in DNA synthesis',
      'May reduce heart disease risk',
      'Supports mental health'
    ],
    sources: [
      'Leafy green vegetables',
      'Legumes',
      'Fortified grains',
      'Citrus fruits',
      'Avocados'
    ],
    deficiency_symptoms: [
      'Fatigue and weakness',
      'Mouth sores',
      'Tongue swelling',
      'Irritability',
      'Poor growth in children'
    ],
    daily_requirement: '400 mcg for adults (600 mcg during pregnancy)'
  },
  {
    id: '10',
    name: 'Potassium',
    category: 'Electrolytes',
    description: 'Essential electrolyte that helps maintain fluid balance, nerve signals, and muscle contractions, especially in the heart.',
    benefits: [
      'Regulates fluid balance',
      'Supports muscle contractions',
      'Maintains heart rhythm',
      'Reduces blood pressure',
      'Protects against stroke'
    ],
    sources: [
      'Bananas',
      'Sweet potatoes',
      'Spinach',
      'Beans',
      'Avocados'
    ],
    deficiency_symptoms: [
      'Muscle weakness',
      'Fatigue',
      'Constipation',
      'Irregular heartbeat',
      'Muscle cramps'
    ],
    daily_requirement: '2600-3400 mg for adults'
  }
];

export function searchNutrients(query: string): Nutrient[] {
  if (!query.trim()) return KNOWLEDGE_BASE;
  
  const lowerQuery = query.toLowerCase();
  return KNOWLEDGE_BASE.filter(nutrient => 
    nutrient.name.toLowerCase().includes(lowerQuery) ||
    nutrient.category.toLowerCase().includes(lowerQuery) ||
    nutrient.description.toLowerCase().includes(lowerQuery) ||
    nutrient.benefits.some(b => b.toLowerCase().includes(lowerQuery)) ||
    nutrient.sources.some(s => s.toLowerCase().includes(lowerQuery))
  );
}
