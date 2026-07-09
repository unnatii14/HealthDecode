import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker - use the bundled version
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface Biomarker {
  name: string;
  value: number;
  unit: string;
  reference_range: { min: number; max: number };
  status: 'normal' | 'low' | 'high';
  category: string;
  explanation: string;
  implications: string[];
}

export interface AnalysisResult {
  biomarkers: Biomarker[];
  summary: string;
  recommendations: string[];
}

// Extract text from PDF using PDF.js
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

// Extract text from image using Tesseract.js
async function extractTextFromImage(file: File, onProgress?: (progress: number) => void): Promise<string> {
  const worker = await createWorker('eng', undefined, {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });
  
  const result = await worker.recognize(file);
  
  await worker.terminate();
  return result.data.text;
}

// Parse biomarkers from extracted text
function parseBiomarkers(text: string): Biomarker[] {
  const biomarkers: Biomarker[] = [];
  
  // Keep original text for better pattern matching
  const originalText = text;
  // Also create normalized version for flexible matching
  const normalizedText = text.replace(/\s+/g, ' ').toLowerCase();
  
  console.log('Extracted text preview:', normalizedText.substring(0, 500));
  console.log('Full text length:', text.length);
  
  // Common biomarker patterns with reference ranges - more flexible patterns
  const biomarkerPatterns = [
    // Blood Sugar / Diabetes
    { 
      pattern: /(?:glucose|blood\s*sugar|fasting\s*glucose|fbs|random\s*blood\s*sugar|rbs).{0,100}?(\d+\.?\d*)/i,
      name: 'Glucose',
      unit: 'mg/dL',
      range: { min: 70, max: 100 },
      category: 'Diabetes',
      explanation: 'Blood glucose measures the amount of sugar in your blood. Elevated levels may indicate diabetes or prediabetes.',
      implications: ['Risk of diabetes complications', 'May require dietary modifications', 'Monitor regularly']
    },
    {
      pattern: /(?:hba1c|hemoglobin\s*a1c|glycated\s*hemoglobin|glycohemoglobin).{0,100}?(\d+\.?\d*)/i,
      name: 'HbA1c',
      unit: '%',
      range: { min: 4.0, max: 5.6 },
      category: 'Diabetes',
      explanation: 'HbA1c reflects your average blood sugar levels over the past 2-3 months.',
      implications: ['Indicates long-term glucose control', 'Higher values suggest diabetes risk']
    },
    
    // Lipid Profile
    {
      pattern: /(?:total\s*cholesterol|cholesterol\s*total|cholesterol|chol\b).{0,100}?(\d+\.?\d*)/i,
      name: 'Total Cholesterol',
      unit: 'mg/dL',
      range: { min: 125, max: 200 },
      category: 'Lipid Profile',
      explanation: 'Total cholesterol measures all cholesterol in your blood. High levels increase heart disease risk.',
      implications: ['Risk factor for cardiovascular disease', 'May require lifestyle changes']
    },
    {
      pattern: /(?:ldl|ldl\s*cholesterol|low\s*density\s*lipoprotein).{0,100}?(\d+\.?\d*)/i,
      name: 'LDL Cholesterol',
      unit: 'mg/dL',
      range: { min: 0, max: 100 },
      category: 'Lipid Profile',
      explanation: 'LDL is "bad" cholesterol that can build up in arteries.',
      implications: ['Increases risk of heart disease and stroke', 'Diet and exercise can help lower']
    },
    {
      pattern: /(?:hdl|hdl\s*cholesterol|high\s*density\s*lipoprotein).{0,100}?(\d+\.?\d*)/i,
      name: 'HDL Cholesterol',
      unit: 'mg/dL',
      range: { min: 40, max: 60 },
      category: 'Lipid Profile',
      explanation: 'HDL is "good" cholesterol that helps remove other forms of cholesterol.',
      implications: ['Higher levels are protective', 'Low levels increase heart disease risk']
    },
    {
      pattern: /(?:triglycerides?|tg|trigs?).{0,100}?(\d+\.?\d*)/i,
      name: 'Triglycerides',
      unit: 'mg/dL',
      range: { min: 0, max: 150 },
      category: 'Lipid Profile',
      explanation: 'Triglycerides are a type of fat in your blood. High levels increase heart disease risk.',
      implications: ['Excess calories convert to triglycerides', 'Weight loss can help reduce levels']
    },
    
    // Liver Function
    {
      pattern: /(?:sgpt|alt|alanine\s*aminotransferase|alanine\s*transaminase).{0,100}?(\d+\.?\d*)/i,
      name: 'ALT (SGPT)',
      unit: 'U/L',
      range: { min: 7, max: 56 },
      category: 'Liver Function',
      explanation: 'ALT is an enzyme found in the liver. Elevated levels may indicate liver damage.',
      implications: ['Liver inflammation or damage', 'May require further liver evaluation']
    },
    {
      pattern: /(?:sgot|ast|aspartate\s*aminotransferase|aspartate\s*transaminase).{0,100}?(\d+\.?\d*)/i,
      name: 'AST (SGOT)',
      unit: 'U/L',
      range: { min: 10, max: 40 },
      category: 'Liver Function',
      explanation: 'AST is an enzyme found in liver, heart, and muscles. Elevation suggests tissue damage.',
      implications: ['May indicate liver or heart issues', 'Compare with ALT levels']
    },
    {
      pattern: /(?:alkaline phosphatase|alp)[\s:]*(\d+\.?\d*)\s*(?:u\/l)?/i,
      name: 'Alkaline Phosphatase',
      unit: 'U/L',
      range: { min: 44, max: 147 },
      category: 'Liver Function',
      explanation: 'ALP is an enzyme related to bile ducts and bone. Abnormal levels may indicate liver or bone disorders.',
      implications: ['Elevated in liver or bone disease', 'May need imaging studies']
    },
    
    // Kidney Function
    {
      pattern: /(?:creatinine|serum\s*creatinine|creat)[\s:=-]*(\d+\.?\d*)/i,
      name: 'Creatinine',
      unit: 'mg/dL',
      range: { min: 0.7, max: 1.3 },
      category: 'Kidney Function',
      explanation: 'Creatinine is a waste product filtered by kidneys. High levels indicate kidney problems.',
      implications: ['Reduced kidney function', 'May need kidney evaluation']
    },
    {
      pattern: /(?:blood urea nitrogen|bun)[\s:]*(\d+\.?\d*)\s*(?:mg\/dl)?/i,
      name: 'Blood Urea Nitrogen (BUN)',
      unit: 'mg/dL',
      range: { min: 7, max: 20 },
      category: 'Kidney Function',
      explanation: 'BUN measures waste products from protein breakdown. Abnormal levels suggest kidney issues.',
      implications: ['Kidney dysfunction', 'Dehydration or high protein diet']
    },
    {
      pattern: /(?:uric acid)[\s:]*(\d+\.?\d*)\s*(?:mg\/dl)?/i,
      name: 'Uric Acid',
      unit: 'mg/dL',
      range: { min: 3.5, max: 7.2 },
      category: 'Kidney Function',
      explanation: 'Uric acid is a waste product. High levels can cause gout and kidney stones.',
      implications: ['Risk of gout attacks', 'May form kidney stones']
    },
    
    // Complete Blood Count
    {
      pattern: /(?:hemoglobin|haemoglobin|hb|hgb).{0,100}?(\d+\.?\d*)/i,
      name: 'Hemoglobin',
      unit: 'g/dL',
      range: { min: 13.0, max: 17.0 },
      category: 'Blood Count',
      explanation: 'Hemoglobin carries oxygen in blood. Low levels indicate anemia.',
      implications: ['Anemia symptoms', 'May need iron supplementation']
    },
    {
      pattern: /(?:white blood cell|wbc|leukocyte)[\s:]*(\d+\.?\d*)\s*(?:\/cumm|cells\/μl)?/i,
      name: 'White Blood Cells',
      unit: '/cumm',
      range: { min: 4000, max: 11000 },
      category: 'Blood Count',
      explanation: 'WBCs fight infections. Abnormal levels may indicate infection or immune disorders.',
      implications: ['Infection or inflammation', 'Immune system evaluation needed']
    },
    {
      pattern: /(?:platelet count|platelets)[\s:]*(\d+\.?\d*)\s*(?:\/cumm|cells\/μl)?/i,
      name: 'Platelets',
      unit: '/cumm',
      range: { min: 150000, max: 400000 },
      category: 'Blood Count',
      explanation: 'Platelets help blood clot. Abnormal levels affect bleeding and clotting.',
      implications: ['Bleeding or clotting issues', 'May need hematology review']
    },
    
    // Thyroid
    {
      pattern: /(?:tsh|thyroid\s*stimulating\s*hormone|thyrotropin)[\s:=-]*(\d+\.?\d*)/i,
      name: 'TSH',
      unit: 'μIU/mL',
      range: { min: 0.4, max: 4.0 },
      category: 'Thyroid',
      explanation: 'TSH regulates thyroid hormone production. Abnormal levels indicate thyroid dysfunction.',
      implications: ['Hypothyroidism or hyperthyroidism', 'May need thyroid medication']
    },
    {
      pattern: /(?:t3|triiodothyronine)[\s:]*(\d+\.?\d*)\s*(?:ng\/dl)?/i,
      name: 'T3',
      unit: 'ng/dL',
      range: { min: 80, max: 200 },
      category: 'Thyroid',
      explanation: 'T3 is an active thyroid hormone affecting metabolism.',
      implications: ['Metabolic rate changes', 'Weight and energy level impacts']
    },
    {
      pattern: /(?:t4|thyroxine)[\s:]*(\d+\.?\d*)\s*(?:μg\/dl)?/i,
      name: 'T4',
      unit: 'μg/dL',
      range: { min: 5.0, max: 12.0 },
      category: 'Thyroid',
      explanation: 'T4 is the main thyroid hormone produced by the thyroid gland.',
      implications: ['Thyroid function indicator', 'Affects overall metabolism']
    },
    
    // Vitamins & Minerals
    {
      pattern: /(?:vitamin\s*d|25\s*-?\s*oh\s*vitamin\s*d|vit\s*d|cholecalciferol).{0,100}?(\d+\.?\d*)/i,
      name: 'Vitamin D',
      unit: 'ng/mL',
      range: { min: 30, max: 100 },
      category: 'Vitamins',
      explanation: 'Vitamin D is essential for bone health and immune function.',
      implications: ['Bone health concerns', 'Supplementation may be needed']
    },
    {
      pattern: /(?:vitamin\s*b\s*12|vit\s*b\s*12|cobalamin|cyanocobalamin).{0,100}?(\d+\.?\d*)/i,
      name: 'Vitamin B12',
      unit: 'pg/mL',
      range: { min: 200, max: 900 },
      category: 'Vitamins',
      explanation: 'B12 is crucial for nerve function and red blood cell formation.',
      implications: ['Nerve damage risk', 'Anemia symptoms']
    },
    {
      pattern: /(?:iron|serum\s*iron).{0,100}?(\d+\.?\d*)/i,
      name: 'Iron',
      unit: 'μg/dL',
      range: { min: 60, max: 170 },
      category: 'Vitamins',
      explanation: 'Iron is essential for hemoglobin production and oxygen transport.',
      implications: ['Anemia or iron overload', 'Dietary adjustments needed']
    },
    {
      pattern: /(?:calcium|serum\s*calcium).{0,100}?(\d+\.?\d*)/i,
      name: 'Calcium',
      unit: 'mg/dL',
      range: { min: 8.5, max: 10.5 },
      category: 'Minerals',
      explanation: 'Calcium is vital for bone health, muscle function, and nerve signaling.',
      implications: ['Bone density concerns', 'Muscle and nerve function']
    },
    
    // Electrolytes
    {
      pattern: /(?:sodium|na\b).{0,100}?(\d+\.?\d*)/i,
      name: 'Sodium',
      unit: 'mEq/L',
      range: { min: 136, max: 145 },
      category: 'Electrolytes',
      explanation: 'Sodium maintains fluid balance and nerve function.',
      implications: ['Dehydration or fluid overload', 'Affects blood pressure']
    },
    {
      pattern: /(?:potassium|k)[\s:]*(\d+\.?\d*)\s*(?:meq\/l)?/i,
      name: 'Potassium',
      unit: 'mEq/L',
      range: { min: 3.5, max: 5.0 },
      category: 'Electrolytes',
      explanation: 'Potassium is essential for heart rhythm and muscle function.',
      implications: ['Cardiac arrhythmia risk', 'Muscle weakness']
    },
  ];

  // Try to extract from original text first (preserves formatting)
  for (const pattern of biomarkerPatterns) {
    const match = originalText.match(pattern.pattern);
    if (match && match[1]) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0 && value < 10000) { // Sanity check
        const status = value < pattern.range.min ? 'low' : 
                      value > pattern.range.max ? 'high' : 'normal';
        
        biomarkers.push({
          name: pattern.name,
          value,
          unit: pattern.unit,
          reference_range: pattern.range,
          status,
          category: pattern.category,
          explanation: pattern.explanation,
          implications: pattern.implications
        });
      }
    }
  }
  
  // If no matches, try with normalized text
  if (biomarkers.length === 0) {
    for (const pattern of biomarkerPatterns) {
      const match = normalizedText.match(pattern.pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && value > 0 && value < 10000) {
          const status = value < pattern.range.min ? 'low' : 
                        value > pattern.range.max ? 'high' : 'normal';
          
          biomarkers.push({
            name: pattern.name,
            value,
            unit: pattern.unit,
            reference_range: pattern.range,
            status,
            category: pattern.category,
            explanation: pattern.explanation,
            implications: pattern.implications
          });
        }
      }
    }
  }
  
  // Remove duplicates (same test name)
  const uniqueBiomarkers = biomarkers.filter((bio, index, self) => 
    index === self.findIndex(b => b.name === bio.name)
  );

  return uniqueBiomarkers;
}

// Generate summary based on biomarkers
function generateSummary(biomarkers: Biomarker[]): string {
  const abnormal = biomarkers.filter(b => b.status !== 'normal');
  const critical = abnormal.filter(b => b.status === 'high' || b.status === 'low');
  
  if (biomarkers.length === 0) {
    return 'No biomarkers detected in the report. Please ensure the document contains clear test results.';
  }
  
  if (abnormal.length === 0) {
    return `All ${biomarkers.length} biomarkers are within normal range. Your test results look healthy!`;
  }
  
  return `Analysis found ${biomarkers.length} biomarkers: ${biomarkers.filter(b => b.status === 'normal').length} normal, ${biomarkers.filter(b => b.status === 'low').length} below range, ${biomarkers.filter(b => b.status === 'high').length} above range. ${critical.length > 0 ? 'Some values require attention.' : 'Minor deviations noted.'}`;
}

// Generate recommendations based on biomarkers
function generateRecommendations(biomarkers: Biomarker[]): string[] {
  const recommendations: string[] = [];
  const abnormal = biomarkers.filter(b => b.status !== 'normal');
  
  if (abnormal.length === 0) {
    recommendations.push('Maintain your current healthy lifestyle');
    recommendations.push('Continue regular health check-ups');
    return recommendations;
  }
  
  // Category-specific recommendations
  const categories = new Set(abnormal.map(b => b.category));
  
  if (categories.has('Diabetes')) {
    recommendations.push('Monitor blood sugar levels regularly');
    recommendations.push('Consider dietary modifications to control glucose');
  }
  
  if (categories.has('Lipid Profile')) {
    recommendations.push('Adopt a heart-healthy diet low in saturated fats');
    recommendations.push('Increase physical activity to 150 minutes per week');
  }
  
  if (categories.has('Liver Function')) {
    recommendations.push('Avoid alcohol and hepatotoxic medications');
    recommendations.push('Follow up with a gastroenterologist');
  }
  
  if (categories.has('Kidney Function')) {
    recommendations.push('Stay well-hydrated and monitor kidney function');
    recommendations.push('Consult a nephrologist for evaluation');
  }
  
  if (categories.has('Thyroid')) {
    recommendations.push('Consult an endocrinologist for thyroid management');
    recommendations.push('Consider thyroid hormone medication if needed');
  }
  
  if (categories.has('Vitamins') || categories.has('Minerals')) {
    recommendations.push('Consider supplementation after consulting your doctor');
    recommendations.push('Eat a balanced diet rich in essential nutrients');
  }
  
  recommendations.push('Schedule a follow-up appointment with your healthcare provider');
  recommendations.push('Discuss these results with your doctor before making changes');
  
  return recommendations.slice(0, 6); // Limit to 6 recommendations
}

// Main analysis function
export async function analyzeReportClient(
  file: File,
  onProgress?: (progress: number) => void
): Promise<AnalysisResult> {
  let text = '';
  
  try {
    if (file.type === 'application/pdf') {
      onProgress?.(10);
      text = await extractTextFromPDF(file);
      console.log('PDF text extracted, length:', text.length);
      onProgress?.(60);
    } else if (file.type.startsWith('image/')) {
      onProgress?.(10);
      text = await extractTextFromImage(file, (progress) => {
        onProgress?.(10 + progress * 0.5);
      });
      console.log('Image text extracted, length:', text.length);
    } else {
      throw new Error('Unsupported file type. Please upload a PDF or image file.');
    }
    
    if (!text || text.trim().length < 50) {
      console.error('Insufficient text extracted:', text);
      throw new Error('Unable to extract sufficient text from the document. Please ensure the file contains clear, readable text.');
    }
    
    onProgress?.(70);
    
    const biomarkers = parseBiomarkers(text);
    console.log('Biomarkers found:', biomarkers.length);
    
    if (biomarkers.length === 0) {
      console.log('Text sample:', text.substring(0, 1000));
      console.log('Searching in middle section:', text.substring(5000, 6000));
      console.log('Searching in end section:', text.substring(text.length - 1000));
      throw new Error('No biomarkers detected in this report. The document may be scanned as an image. Try uploading as an image file (JPG/PNG) instead, or ensure it contains recognizable test values.');
    }
    
    onProgress?.(85);
    
    const summary = generateSummary(biomarkers);
    const recommendations = generateRecommendations(biomarkers);
    
    onProgress?.(100);
    
    return {
      biomarkers,
      summary,
      recommendations
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze report');
  }
}
