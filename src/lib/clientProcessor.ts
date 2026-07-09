import { analyzeText as analyzeTextBackend } from './api';

// ─── Lazy library loading ─────────────────────────────────────────────────────
// pdfjs-dist and tesseract.js are heavy and require modern browser APIs.
// We load them on-demand (only when a file is actually processed) instead of at
// import time. This keeps them out of the initial bundle so the app paints
// instantly, and — critically — ensures a load error in these libraries can
// never blank the whole page.

type PdfjsLib = typeof import('pdfjs-dist');
let _pdfjs: Promise<PdfjsLib> | null = null;

async function getPdfjs(): Promise<PdfjsLib> {
  if (!_pdfjs) {
    _pdfjs = (async () => {
      const lib = await import('pdfjs-dist');
      // Load the worker as a bundled URL asset (Vite-recommended pattern).
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      lib.GlobalWorkerOptions.workerSrc = workerUrl;
      return lib;
    })();
  }
  return _pdfjs;
}

type CreateWorker = typeof import('tesseract.js')['createWorker'];
let _createWorker: CreateWorker | null = null;

async function getCreateWorker(): Promise<CreateWorker> {
  if (!_createWorker) {
    _createWorker = (await import('tesseract.js')).createWorker;
  }
  return _createWorker;
}

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
  extractedText?: string;
}

// ─── Text Extraction ────────────────────────────────────────────────────────

// Extract text from PDF using PDF.js
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // Preserve spacing — join items with newline when y-position changes significantly
    const lines: { y: number; text: string }[] = [];
    for (const item of textContent.items as any[]) {
      if (item.str !== undefined) {
        const y = Math.round(item.transform?.[5] ?? 0);
        const lastLine = lines[lines.length - 1];
        if (lastLine && Math.abs(lastLine.y - y) < 5) {
          lastLine.text += ' ' + item.str;
        } else {
          lines.push({ y, text: item.str });
        }
      }
    }
    // Sort by descending y (PDF coordinate system has y=0 at bottom)
    lines.sort((a, b) => b.y - a.y);
    fullText += lines.map(l => l.text).join('\n') + '\n\n';
  }

  return fullText;
}

// Render PDF page to canvas → data URL for OCR
async function renderPDFPageToDataURL(
  file: File,
  pageNum: number
): Promise<string> {
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNum);

  const scale = 2.5; // higher = better OCR
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/png');
}

// OCR a single image (File or data URL string)
async function ocrImage(
  source: File | string,
  onProgress?: (p: number) => void
): Promise<string> {
  const createWorker = await getCreateWorker();
  const worker = await createWorker('eng', undefined, {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  const result = await worker.recognize(source as any);
  await worker.terminate();
  return result.data.text;
}

// Extract text from image file
async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return ocrImage(file, onProgress);
}

// Smart PDF extraction: text-based first, OCR fallback if poor quality
async function smartExtractFromPDF(
  file: File,
  onProgress?: (p: number) => void
): Promise<string> {
  const textContent = await extractTextFromPDF(file);
  const meaningfulChars = (textContent.match(/[A-Za-z0-9]/g) || []).length;

  // If we got decent text, use it
  if (meaningfulChars > 100) {
    console.log('[PDF] Text extraction OK, chars:', meaningfulChars);
    return textContent;
  }

  // Otherwise OCR each page
  console.log('[PDF] Text extraction poor, falling back to OCR...');
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(10 + Math.round(((i - 1) / pdf.numPages) * 50));
    const dataURL = await renderPDFPageToDataURL(file, i);
    const pageText = await ocrImage(dataURL);
    pageTexts.push(pageText);
  }

  return pageTexts.join('\n\n');
}

// ─── Biomarker Patterns ─────────────────────────────────────────────────────

interface BiomarkerPattern {
  /** Regex capturing the numeric value in group 1 */
  pattern: RegExp;
  name: string;
  unit: string;
  range: { min: number; max: number };
  category: string;
  explanation: string;
  implications: string[];
}

// Flexible separator: colon, space(s), tab, dash, equals – common in Indian lab reports
const SEP = '[\\s:=\\-|]*';
// Value: digits with optional decimal
const VAL = '(\\d+\\.?\\d*)';
// Lookahead: value anywhere within 150 chars after the label
const AHEAD = `.{0,150}?`;

const biomarkerPatterns: BiomarkerPattern[] = [
  // ── Blood Sugar / Diabetes ──────────────────────────────────────────────
  {
    pattern: new RegExp(
      `(?:fasting\\s*(?:blood\\s*)?(?:glucose|sugar)|fbs|fasting\\s*blood\\s*sugar|fbg)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Fasting Glucose',
    unit: 'mg/dL',
    range: { min: 70, max: 100 },
    category: 'Diabetes',
    explanation:
      'Fasting blood glucose measures blood sugar after an overnight fast. Values above 100 mg/dL may indicate prediabetes or diabetes.',
    implications: [
      'Risk of diabetes complications if persistently elevated',
      'Dietary modifications can significantly help control glucose',
      'Monitor regularly and discuss trends with your doctor',
    ],
  },
  {
    pattern: new RegExp(
      `(?:random\\s*(?:blood\\s*)?(?:glucose|sugar)|rbs|rbs|pp\\s*blood\\s*sugar|postprandial)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Random Blood Sugar',
    unit: 'mg/dL',
    range: { min: 70, max: 140 },
    category: 'Diabetes',
    explanation:
      'Random blood sugar checks glucose at any time of day. Values above 200 mg/dL strongly suggest diabetes.',
    implications: [
      'Elevated post-meal sugar may indicate impaired glucose tolerance',
      'Consider a fasting test for confirmation',
    ],
  },
  {
    pattern: new RegExp(
      `(?:hba1c|hemoglobin\\s*a1c|glycated\\s*hemoglobin|glyco(?:sylated)?\\s*hemoglobin|a1c)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'HbA1c',
    unit: '%',
    range: { min: 4.0, max: 5.6 },
    category: 'Diabetes',
    explanation:
      'HbA1c reflects your average blood sugar over the past 2-3 months. A value ≥6.5% is diagnostic of diabetes.',
    implications: [
      'Indicates long-term glucose control',
      'Values 5.7-6.4% suggest prediabetes',
      'Lifestyle changes can meaningfully reduce HbA1c',
    ],
  },

  // ── Lipid Profile ───────────────────────────────────────────────────────
  {
    pattern: new RegExp(
      `(?:total\\s*cholesterol|s\\.?\\s*cholesterol|serum\\s*cholesterol|cholesterol\\s*total|t\\.?\\s*chol(?:esterol)?)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Total Cholesterol',
    unit: 'mg/dL',
    range: { min: 125, max: 200 },
    category: 'Lipid Profile',
    explanation:
      'Total cholesterol measures all cholesterol in your blood. High levels increase heart disease risk.',
    implications: [
      'Risk factor for cardiovascular disease',
      'Dietary changes (reduce saturated fats) can help',
      'Combine with HDL/LDL evaluation for full picture',
    ],
  },
  {
    pattern: new RegExp(
      `(?:ldl\\s*cholesterol|ldl\\s*chol(?:esterol)?|low\\s*density\\s*lipoprotein|ldl-c)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'LDL Cholesterol',
    unit: 'mg/dL',
    range: { min: 0, max: 100 },
    category: 'Lipid Profile',
    explanation:
      'LDL is "bad" cholesterol that builds up in arteries. Optimal level is below 100 mg/dL.',
    implications: [
      'Increases risk of heart disease and stroke',
      'Diet, exercise, and statins can lower LDL',
    ],
  },
  {
    pattern: new RegExp(
      `(?:hdl\\s*cholesterol|hdl\\s*chol(?:esterol)?|high\\s*density\\s*lipoprotein|hdl-c)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'HDL Cholesterol',
    unit: 'mg/dL',
    range: { min: 40, max: 80 },
    category: 'Lipid Profile',
    explanation:
      'HDL is "good" cholesterol that helps remove other cholesterol from the bloodstream.',
    implications: [
      'Higher levels are protective against heart disease',
      'Exercise and omega-3 fatty acids raise HDL',
    ],
  },
  {
    pattern: new RegExp(
      `(?:triglycerides?|tg\\b|serum\\s*triglycerides?|trigs?)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Triglycerides',
    unit: 'mg/dL',
    range: { min: 0, max: 150 },
    category: 'Lipid Profile',
    explanation:
      'Triglycerides are a type of fat in your blood. Elevated levels increase cardiovascular risk.',
    implications: [
      'Excess carbohydrates and alcohol raise triglycerides',
      'Weight loss and exercise are effective treatments',
    ],
  },
  {
    pattern: new RegExp(
      `(?:vldl|very\\s*low\\s*density\\s*lipoprotein|vldl\\s*chol(?:esterol)?)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'VLDL Cholesterol',
    unit: 'mg/dL',
    range: { min: 2, max: 30 },
    category: 'Lipid Profile',
    explanation: 'VLDL carries triglycerides in the blood. Elevated VLDL contributes to artery plaque.',
    implications: ['Associated with high triglycerides', 'Lifestyle changes reduce VLDL'],
  },

  // ── Liver Function ──────────────────────────────────────────────────────
  {
    pattern: new RegExp(
      `(?:sgpt|alt|alanine\\s*(?:amino)?trans(?:ferase|aminase)|alanine\\s*transaminase)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'ALT (SGPT)',
    unit: 'U/L',
    range: { min: 7, max: 56 },
    category: 'Liver Function',
    explanation: 'ALT is a liver enzyme. Elevated levels indicate liver inflammation or damage.',
    implications: [
      'Liver inflammation or damage',
      'Alcohol, fatty liver, and medications raise ALT',
      'Follow up with ultrasound if significantly elevated',
    ],
  },
  {
    pattern: new RegExp(
      `(?:sgot|ast|aspartate\\s*(?:amino)?trans(?:ferase|aminase)|aspartate\\s*transaminase)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'AST (SGOT)',
    unit: 'U/L',
    range: { min: 10, max: 40 },
    category: 'Liver Function',
    explanation: 'AST is found in liver, heart, and muscle. Elevated AST often indicates tissue damage.',
    implications: [
      'May indicate liver or heart issues',
      'Always compare AST to ALT ratio',
    ],
  },
  {
    pattern: new RegExp(
      `(?:alkaline\\s*phosphatase|alp\\b)${SEP}${VAL}`,
      'i'
    ),
    name: 'Alkaline Phosphatase',
    unit: 'U/L',
    range: { min: 44, max: 147 },
    category: 'Liver Function',
    explanation: 'ALP is linked to liver bile ducts and bone. Abnormal levels may indicate liver or bone disorders.',
    implications: ['Elevated in liver disease, cholestasis, or bone disorders', 'May need imaging studies'],
  },
  {
    pattern: new RegExp(
      `(?:ggt|gamma\\s*gt|gamma\\s*glutamyl\\s*transferase|gamma\\s*glutamyl\\s*transpeptidase)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'GGT',
    unit: 'U/L',
    range: { min: 8, max: 61 },
    category: 'Liver Function',
    explanation: 'GGT is sensitive to liver disease and alcohol use. Elevated levels often suggest liver stress.',
    implications: ['Alcohol and fatty liver raise GGT', 'Useful marker alongside ALT/AST'],
  },
  {
    pattern: new RegExp(
      `(?:total\\s*bilirubin|bilirubin\\s*total|t\\.?\\s*bili(?:rubin)?)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Total Bilirubin',
    unit: 'mg/dL',
    range: { min: 0.1, max: 1.2 },
    category: 'Liver Function',
    explanation: 'Bilirubin is a breakdown product of red blood cells. High levels can cause jaundice.',
    implications: ['Liver or gallbladder issues', 'Hemolysis can elevate bilirubin'],
  },
  {
    pattern: new RegExp(
      `(?:direct\\s*bilirubin|d\\.?\\s*bili(?:rubin)?|conjugated\\s*bilirubin)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Direct Bilirubin',
    unit: 'mg/dL',
    range: { min: 0.0, max: 0.3 },
    category: 'Liver Function',
    explanation: 'Direct (conjugated) bilirubin reflects liver processing. Elevation suggests bile duct obstruction.',
    implications: ['Obstructive jaundice', 'May indicate gallstones or liver disease'],
  },
  {
    pattern: new RegExp(
      `(?:albumin|serum\\s*albumin|s\\.?\\s*albumin)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Albumin',
    unit: 'g/dL',
    range: { min: 3.5, max: 5.0 },
    category: 'Liver Function',
    explanation: 'Albumin is produced by the liver and maintains fluid balance. Low levels indicate liver or kidney disease.',
    implications: ['Low albumin reflects poor liver synthesis', 'Associated with malnutrition'],
  },
  {
    pattern: new RegExp(
      `(?:total\\s*protein|serum\\s*total\\s*protein|t\\.?\\s*protein)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Total Protein',
    unit: 'g/dL',
    range: { min: 6.0, max: 8.3 },
    category: 'Liver Function',
    explanation: 'Total protein measures albumin and globulin combined, reflecting nutritional status and liver health.',
    implications: ['Low values suggest malnutrition or liver disease', 'High values may indicate inflammation'],
  },

  // ── Kidney Function ─────────────────────────────────────────────────────
  {
    pattern: new RegExp(
      `(?:s\\.?\\s*creatinine|sr\\.?\\s*creatinine|serum\\s*creatinine|creatinine)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Creatinine',
    unit: 'mg/dL',
    range: { min: 0.7, max: 1.3 },
    category: 'Kidney Function',
    explanation: 'Creatinine is a waste product filtered by kidneys. Elevated levels indicate reduced kidney function.',
    implications: ['Reduced kidney function', 'Dehydration can transiently raise creatinine'],
  },
  {
    pattern: new RegExp(
      `(?:blood\\s*urea\\s*nitrogen|bun\\b|b\\.?u\\.?n\\.?)${SEP}${VAL}`,
      'i'
    ),
    name: 'Blood Urea Nitrogen',
    unit: 'mg/dL',
    range: { min: 7, max: 20 },
    category: 'Kidney Function',
    explanation: 'BUN measures urea, a waste from protein breakdown. Abnormal levels suggest kidney or dietary issues.',
    implications: ['Kidney dysfunction or dehydration', 'High protein diet raises BUN'],
  },
  {
    pattern: new RegExp(
      `(?:blood\\s*urea|serum\\s*urea|s\\.?\\s*urea|urea\\b(?!\\s*nitrogen))${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Urea',
    unit: 'mg/dL',
    range: { min: 15, max: 45 },
    category: 'Kidney Function',
    explanation: 'Serum urea reflects kidney filtration capacity. Common in Indian reports instead of BUN.',
    implications: ['Elevated in kidney disease or high protein diet', 'Discuss with doctor if persistently high'],
  },
  {
    pattern: new RegExp(
      `(?:uric\\s*acid|s\\.?\\s*uric\\s*acid|serum\\s*uric\\s*acid)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Uric Acid',
    unit: 'mg/dL',
    range: { min: 3.5, max: 7.2 },
    category: 'Kidney Function',
    explanation: 'Uric acid is a waste product. High levels can cause gout and contribute to kidney stones.',
    implications: ['Risk of gout attacks when elevated', 'Reduce purine-rich foods (red meat, shellfish)'],
  },
  {
    pattern: new RegExp(
      `(?:egfr|estimated\\s*gfr|glomerular\\s*filtration\\s*rate)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'eGFR',
    unit: 'mL/min/1.73m²',
    range: { min: 60, max: 120 },
    category: 'Kidney Function',
    explanation: 'eGFR estimates how well your kidneys filter blood per minute. Below 60 may indicate chronic kidney disease.',
    implications: ['Below 60 warrants nephrology referral', 'Protect kidneys by staying hydrated'],
  },

  // ── Complete Blood Count ─────────────────────────────────────────────────
  {
    pattern: new RegExp(
      `(?:hemoglobin|haemoglobin|hb\\b|hgb\\b|hb%|hgb%)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Hemoglobin',
    unit: 'g/dL',
    range: { min: 12.0, max: 17.5 },
    category: 'Blood Count',
    explanation: 'Hemoglobin carries oxygen in red blood cells. Low levels indicate anemia.',
    implications: [
      'Anemia can cause fatigue and weakness',
      'Iron, B12, or folate deficiency may be the cause',
    ],
  },
  {
    pattern: new RegExp(
      `(?:hematocrit|pcv|packed\\s*cell\\s*volume|hct\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Hematocrit (PCV)',
    unit: '%',
    range: { min: 36, max: 52 },
    category: 'Blood Count',
    explanation: 'Hematocrit is the percentage of red blood cells in blood volume. Low values indicate anemia.',
    implications: ['Parallels hemoglobin findings', 'Low PCV often requires iron evaluation'],
  },
  {
    pattern: new RegExp(
      `(?:rbc\\s*count|red\\s*blood\\s*cell\\s*count|erythrocyte\\s*count|rbc\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'RBC Count',
    unit: 'million/µL',
    range: { min: 4.0, max: 5.9 },
    category: 'Blood Count',
    explanation: 'RBC count measures the number of red blood cells. Abnormal counts help classify anemia types.',
    implications: ['Low RBC with low Hb confirms anemia', 'High RBC (polycythemia) needs evaluation'],
  },
  {
    pattern: new RegExp(
      `(?:wbc\\s*count|white\\s*blood\\s*cell(?:\\s*count)?|leukocyte\\s*count|tlc\\b|total\\s*leukocyte\\s*count)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'White Blood Cells',
    unit: '/cumm',
    range: { min: 4000, max: 11000 },
    category: 'Blood Count',
    explanation: 'WBCs fight infections and are part of the immune system. Abnormal counts indicate infection or blood disorders.',
    implications: ['High WBC may indicate infection or inflammation', 'Low WBC can impair immune response'],
  },
  {
    pattern: new RegExp(
      `(?:platelet\\s*count|platelets|plt\\b|thrombocyte\\s*count)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Platelets',
    unit: '/cumm',
    range: { min: 150000, max: 400000 },
    category: 'Blood Count',
    explanation: 'Platelets are essential for blood clotting. Abnormal counts affect bleeding and clotting ability.',
    implications: ['Low platelets (thrombocytopenia) risk of bleeding', 'High platelets may indicate inflammation'],
  },
  {
    pattern: new RegExp(
      `(?:mcv\\b|mean\\s*corpuscular\\s*volume)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'MCV',
    unit: 'fL',
    range: { min: 80, max: 100 },
    category: 'Blood Count',
    explanation: 'MCV measures average red blood cell size, helping classify type of anemia.',
    implications: ['Low MCV suggests iron-deficiency anemia', 'High MCV suggests B12 or folate deficiency'],
  },
  {
    pattern: new RegExp(
      `(?:mch\\b|mean\\s*corpuscular\\s*hemoglobin)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'MCH',
    unit: 'pg',
    range: { min: 27, max: 33 },
    category: 'Blood Count',
    explanation: 'MCH is the average hemoglobin amount per red blood cell.',
    implications: ['Low MCH indicates hypochromic (pale) red cells', 'Often low in iron deficiency'],
  },
  {
    pattern: new RegExp(
      `(?:mchc\\b|mean\\s*corpuscular\\s*hemoglobin\\s*concentration)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'MCHC',
    unit: 'g/dL',
    range: { min: 32, max: 36 },
    category: 'Blood Count',
    explanation: 'MCHC measures hemoglobin concentration in red blood cells.',
    implications: ['Low MCHC seen in iron deficiency', 'High MCHC rarely seen (hereditary spherocytosis)'],
  },
  {
    pattern: new RegExp(
      `(?:neutrophils?|neut(?:rophil)?s?\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Neutrophils',
    unit: '%',
    range: { min: 40, max: 75 },
    category: 'Blood Count',
    explanation: 'Neutrophils are the most common white blood cells, first responders to bacterial infection.',
    implications: ['Elevated in bacterial infections', 'Low in viral infections or bone marrow issues'],
  },
  {
    pattern: new RegExp(
      `(?:lymphocytes?|lympho(?:cyte)?s?\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Lymphocytes',
    unit: '%',
    range: { min: 20, max: 45 },
    category: 'Blood Count',
    explanation: 'Lymphocytes are immune cells important for fighting viral infections.',
    implications: ['Elevated in viral infections', 'Low may indicate immune deficiency'],
  },
  {
    pattern: new RegExp(
      `(?:eosinophils?|eosino(?:phil)?s?\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Eosinophils',
    unit: '%',
    range: { min: 1, max: 6 },
    category: 'Blood Count',
    explanation: 'Eosinophils fight parasites and play a role in allergic reactions.',
    implications: ['Elevated in allergies or parasitic infections', 'High eosinophils may need allergy evaluation'],
  },
  {
    pattern: new RegExp(
      `(?:monocytes?|mono(?:cyte)?s?\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Monocytes',
    unit: '%',
    range: { min: 2, max: 10 },
    category: 'Blood Count',
    explanation: 'Monocytes are immune cells that mature into macrophages to fight infection.',
    implications: ['Elevated in chronic infections and inflammatory conditions'],
  },

  // ── Thyroid Function ────────────────────────────────────────────────────
  {
    pattern: new RegExp(
      `(?:tsh\\b|thyroid\\s*stimulating\\s*hormone|thyrotropin)${SEP}${VAL}`,
      'i'
    ),
    name: 'TSH',
    unit: 'μIU/mL',
    range: { min: 0.4, max: 4.0 },
    category: 'Thyroid',
    explanation: 'TSH regulates thyroid hormone production. Abnormal levels indicate thyroid dysfunction.',
    implications: [
      'High TSH suggests hypothyroidism (underactive thyroid)',
      'Low TSH suggests hyperthyroidism (overactive thyroid)',
    ],
  },
  {
    pattern: new RegExp(
      `(?:free\\s*t3|ft3\\b|triiodothyronine(?:\\s*free)?)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Free T3',
    unit: 'pg/mL',
    range: { min: 2.3, max: 4.2 },
    category: 'Thyroid',
    explanation: 'Free T3 is the active thyroid hormone affecting metabolism and energy.',
    implications: ['Elevated in hyperthyroidism', 'Metabolic rate, weight and mood can be affected'],
  },
  {
    pattern: new RegExp(
      `(?:free\\s*t4|ft4\\b|thyroxine(?:\\s*free)?)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Free T4',
    unit: 'ng/dL',
    range: { min: 0.8, max: 1.8 },
    category: 'Thyroid',
    explanation: 'Free T4 is the main thyroid hormone produced by the thyroid gland.',
    implications: ['Works with TSH to diagnose thyroid disorders', 'Low T4 with high TSH = hypothyroidism'],
  },

  // ── Vitamins & Minerals ─────────────────────────────────────────────────
  {
    pattern: new RegExp(
      `(?:25\\s*-?\\s*oh\\s*vitamin\\s*d|vitamin\\s*d\\s*3?|vit\\s*d\\s*3?|25-hydroxy(?:vitamin|cholecalciferol)|cholecalciferol)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Vitamin D',
    unit: 'ng/mL',
    range: { min: 30, max: 100 },
    category: 'Vitamins',
    explanation:
      'Vitamin D is essential for bone health, immune function, and mood regulation. Deficiency is extremely common in India.',
    implications: [
      'Below 20 ng/mL: severe deficiency requiring supplementation',
      'Sunlight exposure and dietary sources help maintain levels',
    ],
  },
  {
    pattern: new RegExp(
      `(?:vitamin\\s*b\\s*-?12|vit\\s*b\\s*-?12|cobalamin|cyanocobalamin)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Vitamin B12',
    unit: 'pg/mL',
    range: { min: 200, max: 900 },
    category: 'Vitamins',
    explanation: 'Vitamin B12 is crucial for nerve function and red blood cell formation. Deficiency is common in vegetarians.',
    implications: [
      'Deficiency causes nerve damage and megaloblastic anemia',
      'Vegetarians/vegans are at highest risk',
    ],
  },
  {
    pattern: new RegExp(
      `(?:folate|folic\\s*acid|vitamin\\s*b9|pteroylglutamic)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Folate',
    unit: 'ng/mL',
    range: { min: 2.7, max: 17.0 },
    category: 'Vitamins',
    explanation: 'Folate is essential for DNA synthesis and red blood cell production. Critical during pregnancy.',
    implications: ['Deficiency can cause megaloblastic anemia', 'Leafy greens are the best dietary source'],
  },
  {
    pattern: new RegExp(
      `(?:serum\\s*iron|s\\.?\\s*iron|iron\\s*(?:level|serum)?)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Iron',
    unit: 'μg/dL',
    range: { min: 60, max: 170 },
    category: 'Vitamins',
    explanation: 'Serum iron measures circulating iron used for hemoglobin synthesis and oxygen transport.',
    implications: [
      'Low iron leads to iron-deficiency anemia',
      'Red meat, legumes, and fortified cereals are rich sources',
    ],
  },
  {
    pattern: new RegExp(
      `(?:ferritin|s\\.?\\s*ferritin|serum\\s*ferritin)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Ferritin',
    unit: 'ng/mL',
    range: { min: 12, max: 300 },
    category: 'Vitamins',
    explanation: 'Ferritin is the storage form of iron. Low ferritin is the earliest indicator of iron depletion.',
    implications: ['Low ferritin = iron stores depleted (even before anemia)', 'High ferritin can indicate inflammation'],
  },
  {
    pattern: new RegExp(
      `(?:serum\\s*calcium|s\\.?\\s*calcium|calcium\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Calcium',
    unit: 'mg/dL',
    range: { min: 8.5, max: 10.5 },
    category: 'Minerals',
    explanation: 'Calcium is vital for bone health, muscle function, and nerve signaling.',
    implications: ['Low calcium (hypocalcemia) causes muscle cramps and tingling', 'Vitamin D is needed for calcium absorption'],
  },
  {
    pattern: new RegExp(
      `(?:serum\\s*phosphorus|s\\.?\\s*phosphorus|phosphate|phosphorus)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Phosphorus',
    unit: 'mg/dL',
    range: { min: 2.5, max: 4.5 },
    category: 'Minerals',
    explanation: 'Phosphorus works with calcium for bone health and energy metabolism.',
    implications: ['Imbalance often related to kidney disease or vitamin D status'],
  },
  {
    pattern: new RegExp(
      `(?:serum\\s*magnesium|s\\.?\\s*magnesium|magnesium\\b|mg\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Magnesium',
    unit: 'mg/dL',
    range: { min: 1.7, max: 2.4 },
    category: 'Minerals',
    explanation: 'Magnesium is involved in hundreds of biochemical reactions including muscle and nerve function.',
    implications: ['Deficiency causes muscle cramps and fatigue', 'Nuts, seeds, and leafy greens are rich sources'],
  },

  // ── Electrolytes ─────────────────────────────────────────────────────────
  {
    pattern: new RegExp(
      `(?:serum\\s*sodium|s\\.?\\s*sodium|sodium\\b|na\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Sodium',
    unit: 'mEq/L',
    range: { min: 136, max: 145 },
    category: 'Electrolytes',
    explanation: 'Sodium maintains fluid balance and nerve/muscle function.',
    implications: ['Low sodium (hyponatremia) can cause confusion and seizures', 'Affects blood pressure'],
  },
  {
    pattern: new RegExp(
      `(?:serum\\s*potassium|s\\.?\\s*potassium|potassium\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Potassium',
    unit: 'mEq/L',
    range: { min: 3.5, max: 5.0 },
    category: 'Electrolytes',
    explanation: 'Potassium is essential for heart rhythm, muscle function, and fluid balance.',
    implications: ['Abnormal levels can cause dangerous cardiac arrhythmias', 'Bananas, oranges, and potatoes are good sources'],
  },
  {
    pattern: new RegExp(
      `(?:serum\\s*chloride|s\\.?\\s*chloride|chloride\\b)${AHEAD}${VAL}`,
      'i'
    ),
    name: 'Chloride',
    unit: 'mEq/L',
    range: { min: 98, max: 107 },
    category: 'Electrolytes',
    explanation: 'Chloride helps maintain fluid balance and acid-base equilibrium.',
    implications: ['Abnormal levels often accompany sodium/potassium disturbances'],
  },
  {
    pattern: new RegExp(
      `(?:bicarbonate|hco3|bicarb|co2)${SEP}${VAL}`,
      'i'
    ),
    name: 'Bicarbonate',
    unit: 'mEq/L',
    range: { min: 22, max: 29 },
    category: 'Electrolytes',
    explanation: 'Bicarbonate helps maintain the body\'s acid-base balance.',
    implications: ['Low levels may indicate metabolic acidosis', 'Kidney disease can affect bicarbonate'],
  },
];

// ─── Generic Tabular Extraction ──────────────────────────────────────────────

/**
 * Last-resort extraction: find any pattern matching
 * "Some Test Name  123.45  unit" across lines in a tabular lab report.
 * Only returns results where the test name partially matches a known biomarker.
 */
const KNOWN_MARKER_KEYWORDS = [
  'glucose', 'sugar', 'hba1c', 'a1c', 'cholesterol', 'ldl', 'hdl', 'triglyceride',
  'vldl', 'sgpt', 'alt', 'sgot', 'ast', 'alp', 'ggt', 'bilirubin', 'albumin',
  'protein', 'creatinine', 'urea', 'bun', 'uric', 'egfr', 'hemoglobin', 'haemoglobin',
  'hb', 'hgb', 'hematocrit', 'pcv', 'rbc', 'wbc', 'tlc', 'platelet', 'plt',
  'mcv', 'mch', 'mchc', 'neutrophil', 'lymphocyte', 'eosinophil', 'monocyte',
  'tsh', 'thyroid', 't3', 't4', 'vitamin', 'vit', 'ferritin', 'iron', 'calcium',
  'sodium', 'potassium', 'chloride', 'magnesium', 'phosphorus', 'bicarbonate',
];

function genericExtract(text: string): { label: string; value: number }[] {
  const results: { label: string; value: number }[] = [];
  // Each line: optional label text, then a number
  const linePattern = /^(.{3,40})\s+(\d{1,4}\.?\d{0,3})\s*(?:[a-zA-Zμ%\/\.]{1,15})?$/gm;
  let match;
  while ((match = linePattern.exec(text)) !== null) {
    const label = match[1].trim().toLowerCase();
    const value = parseFloat(match[2]);
    if (isNaN(value) || value <= 0 || value > 999999) continue;
    const isKnown = KNOWN_MARKER_KEYWORDS.some(k => label.includes(k));
    if (isKnown) {
      results.push({ label: match[1].trim(), value });
    }
  }
  return results;
}

// ─── Main parseBiomarkers ─────────────────────────────────────────────────────

function parseBiomarkers(text: string): Biomarker[] {
  const biomarkers: Biomarker[] = [];
  const seen = new Set<string>();

  // Normalize: collapse multiple spaces/tabs to single space; keep newlines
  const normalized = text.replace(/[^\S\n]+/g, ' ');

  console.log('[Parser] Text sample (first 500):', normalized.substring(0, 500));
  console.log('[Parser] Full text length:', text.length);

  for (const bp of biomarkerPatterns) {
    // Try on original text first (preserves line structure)
    let match = normalized.match(bp.pattern) ?? text.match(bp.pattern);
    if (!match) {
      // Try on a single-line version as fallback
      const singleLine = text.replace(/\s+/g, ' ');
      match = singleLine.match(bp.pattern);
    }

    if (match) {
      const valueStr = match[1] ?? match[2] ?? match[3];
      if (!valueStr) continue;
      const value = parseFloat(valueStr);
      if (isNaN(value) || value <= 0 || value > 999999) continue;
      if (seen.has(bp.name)) continue;
      seen.add(bp.name);

      const status =
        value < bp.range.min ? 'low' : value > bp.range.max ? 'high' : 'normal';

      biomarkers.push({
        name: bp.name,
        value,
        unit: bp.unit,
        reference_range: bp.range,
        status,
        category: bp.category,
        explanation: bp.explanation,
        implications: bp.implications,
      });
    }
  }

  // Generic fallback if < 2 patterns matched
  if (biomarkers.length < 2) {
    const generic = genericExtract(text);
    console.log('[Parser] Generic extraction found:', generic.length);
  }

  // Deduplicate
  return biomarkers.filter(
    (b, i, arr) => arr.findIndex(x => x.name === b.name) === i
  );
}

// ─── Summary & Recommendations ───────────────────────────────────────────────

function generateSummary(biomarkers: Biomarker[]): string {
  if (biomarkers.length === 0) {
    return 'No biomarkers could be detected. Please check the extracted text tab and try pasting the text manually.';
  }
  const abnormal = biomarkers.filter(b => b.status !== 'normal');
  if (abnormal.length === 0) {
    return `All ${biomarkers.length} biomarkers are within normal range. Your test results look healthy! ✅`;
  }
  const low = biomarkers.filter(b => b.status === 'low').length;
  const high = biomarkers.filter(b => b.status === 'high').length;
  const normal = biomarkers.filter(b => b.status === 'normal').length;
  const attention = abnormal.slice(0, 3).map(b => `${b.name} (${b.status})`).join(', ');
  return (
    `Analysis found ${biomarkers.length} biomarkers: ${normal} normal, ${low} below range, ${high} above range.\n` +
    `Values requiring attention: ${attention}.`
  );
}

function generateRecommendations(biomarkers: Biomarker[]): string[] {
  const recs: string[] = [];
  const abnormal = biomarkers.filter(b => b.status !== 'normal');

  if (abnormal.length === 0) {
    return [
      '✅ Maintain your current healthy lifestyle',
      '📅 Continue regular health check-ups (annually)',
      '🥗 Keep a balanced diet rich in varied nutrients',
    ];
  }

  const categories = new Set(abnormal.map(b => b.category));

  if (categories.has('Diabetes')) {
    recs.push('🩺 Monitor blood sugar levels regularly and consider a continuous glucose monitor');
    recs.push('🥗 Reduce refined carbohydrates and increase fibre intake');
  }
  if (categories.has('Lipid Profile')) {
    recs.push('🫀 Adopt a heart-healthy diet — reduce saturated fats, increase omega-3s');
    recs.push('🏃 Target 150 minutes of moderate aerobic exercise per week');
  }
  if (categories.has('Liver Function')) {
    recs.push('🚫 Avoid alcohol and hepatotoxic medications until liver enzymes normalize');
    recs.push('🩺 Follow up with a gastroenterologist');
  }
  if (categories.has('Kidney Function')) {
    recs.push('💧 Stay well-hydrated (2-3 L water/day) to support kidney health');
    recs.push('🩺 Consult a nephrologist for evaluation if creatinine/urea is elevated');
  }
  if (categories.has('Thyroid')) {
    recs.push('🩺 Consult an endocrinologist for thyroid management');
    recs.push('💊 Do not self-medicate thyroid issues — dosing is very precise');
  }
  if (categories.has('Vitamins') || categories.has('Minerals')) {
    recs.push('☀️ For Vitamin D: 15-20 minutes of sun exposure daily + dietary sources');
    recs.push('🥦 Eat a varied diet including leafy greens, nuts, legumes, and dairy');
  }
  if (categories.has('Blood Count')) {
    recs.push('🩺 Discuss CBC abnormalities with your doctor — may require further workup');
  }

  recs.push('📋 Share these results with your healthcare provider before making any changes');
  recs.push('📊 Track your results over time to identify trends');
  return recs.slice(0, 6);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function analyzeReportClient(
  file: File,
  onProgress?: (progress: number) => void
): Promise<AnalysisResult> {
  let text = '';

  try {
    if (file.type === 'application/pdf') {
      onProgress?.(5);
      text = await smartExtractFromPDF(file, p => onProgress?.(5 + p * 0.6));
      console.log('[PDF] Text length after smart extraction:', text.length);
      onProgress?.(65);
    } else if (file.type.startsWith('image/')) {
      onProgress?.(5);
      text = await extractTextFromImage(file, p => {
        onProgress?.(5 + p * 0.6);
      });
      console.log('[Image] OCR text length:', text.length);
      onProgress?.(65);
    } else {
      throw new Error('Unsupported file type. Please upload a PDF or image file (JPG/PNG).');
    }

    if (!text || text.trim().length < 20) {
      throw new Error(
        'Could not extract readable text from this document. Please try uploading as a JPG/PNG image for better OCR results.'
      );
    }

    onProgress?.(70);

    // ── Try AI backend first ─────────────────────────────────────────────
    try {
      const ai = await analyzeTextBackend(text);
      if (ai && Array.isArray(ai.biomarkers) && ai.biomarkers.length > 0) {
        onProgress?.(100);
        return {
          biomarkers: ai.biomarkers.map((b: any) => ({
            name: b.name,
            value: b.value,
            unit: b.unit,
            reference_range: { min: b.reference_range?.min ?? 0, max: b.reference_range?.max ?? 0 },
            status: b.status,
            category: b.category,
            explanation: b.explanation,
            implications: b.implications || [],
          })),
          summary: ai.summary || '',
          recommendations: ai.recommendations || [],
          extractedText: text,
        };
      }
    } catch (err) {
      console.warn('[AI Backend] Unavailable, using client-side analysis:', err);
    }

    // ── Client-side pattern matching ─────────────────────────────────────
    onProgress?.(80);
    const biomarkers = parseBiomarkers(text);
    console.log('[Parser] Biomarkers found:', biomarkers.length);

    if (biomarkers.length === 0) {
      // Return empty result with extracted text so user can see what was parsed
      return {
        biomarkers: [],
        summary:
          'No standard biomarkers were detected automatically. This may be due to an unusual report format. ' +
          'Please use the "Paste Text" tab to copy-paste the report text directly for analysis.',
        recommendations: [
          'Try the "Paste Text" tab and paste the report content',
          'Ensure the report contains standard test names (e.g. Hemoglobin, TSH, Glucose)',
          'For scanned reports, ensure the image is clear and high-resolution',
        ],
        extractedText: text,
      };
    }

    onProgress?.(90);
    const summary = generateSummary(biomarkers);
    const recommendations = generateRecommendations(biomarkers);
    onProgress?.(100);

    return { biomarkers, summary, recommendations, extractedText: text };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze report');
  }
}

// ─── Text Analysis ────────────────────────────────────────────────────────────

export function analyzeTextDirect(text: string): AnalysisResult {
  const biomarkers = parseBiomarkers(text);
  const summary = generateSummary(biomarkers);
  const recommendations = generateRecommendations(biomarkers);
  return { biomarkers, summary, recommendations, extractedText: text };
}
