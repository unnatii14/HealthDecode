import { useState, useCallback, useRef } from 'react';
import {
  Upload, FileText, AlertCircle, CheckCircle2, TrendingUp,
  TrendingDown, Minus, ChevronDown, ChevronUp, Clipboard,
  FlaskConical, Eye, EyeOff, Sparkles, Activity, Info
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { analyzeReportClient, analyzeTextDirect } from '../../lib/clientProcessor';

interface Biomarker {
  name: string;
  value: number;
  unit: string;
  referenceRange: { min: number; max: number };
  status: 'normal' | 'low' | 'high';
  category: string;
  explanation: string;
  implications: string[];
}

// ─── Demo Data ──────────────────────────────────────────────────────────────

const DEMO_REPORT_TEXT = `
COMPLETE BLOOD COUNT (CBC) WITH DIFFERENTIAL

Patient: Demo Patient    Date: 09/07/2026    Lab: HealthDecode Demo Lab

TEST                            RESULT      UNIT        REFERENCE RANGE
----------------------------------------------------------------------
Hemoglobin                       9.8        g/dL        12.0 - 17.5
Hematocrit (PCV)                30.2        %           36 - 52
RBC Count                        3.6        million/µL  4.0 - 5.9
WBC Count                       11500       /cumm       4000 - 11000
Platelet Count                  285000      /cumm       150000 - 400000
MCV                              76.0       fL          80 - 100
MCH                              25.0       pg          27 - 33
MCHC                             32.0       g/dL        32 - 36
Neutrophils                      72         %           40 - 75
Lymphocytes                      20         %           20 - 45
Eosinophils                       5         %           1 - 6
Monocytes                         3         %           2 - 10

LIPID PROFILE
----------------------------------------------------------------------
Total Cholesterol               215         mg/dL       < 200
LDL Cholesterol                 142         mg/dL       < 100
HDL Cholesterol                  38         mg/dL       > 40
Triglycerides                   180         mg/dL       < 150
VLDL Cholesterol                 35         mg/dL       2 - 30

LIVER FUNCTION TEST
----------------------------------------------------------------------
SGPT (ALT)                       32         U/L         7 - 56
SGOT (AST)                       28         U/L         10 - 40
Alkaline Phosphatase             95         U/L         44 - 147
Total Bilirubin                  0.9        mg/dL       0.1 - 1.2
Albumin                          4.1        g/dL        3.5 - 5.0

KIDNEY FUNCTION TEST
----------------------------------------------------------------------
S. Creatinine                    1.1        mg/dL       0.7 - 1.3
Blood Urea                       28         mg/dL       15 - 45
Uric Acid                        5.8        mg/dL       3.5 - 7.2
Sodium                          138         mEq/L       136 - 145
Potassium                        4.0        mEq/L       3.5 - 5.0

VITAMINS & MINERALS
----------------------------------------------------------------------
Vitamin D (25-OH)                14.2       ng/mL       30 - 100
Vitamin B12                     185         pg/mL       200 - 900
Serum Iron                       58         μg/dL       60 - 170
Ferritin                          9.5       ng/mL       12 - 300
Calcium                           9.2       mg/dL       8.5 - 10.5

THYROID FUNCTION TEST
----------------------------------------------------------------------
TSH                               4.8       μIU/mL      0.4 - 4.0
Free T3                           2.8       pg/mL       2.3 - 4.2
Free T4                           0.9       ng/dL       0.8 - 1.8

Fasting Glucose                  92         mg/dL       70 - 100
HbA1c                             5.4       %           4.0 - 5.6
`;

// ─── Component ───────────────────────────────────────────────────────────────

type InputMode = 'upload' | 'paste';
type AnalyzeStep =
  | 'idle'
  | 'extracting'
  | 'processing'
  | 'done'
  | 'error';

export default function ReportAnalyzer() {
  // ── State ─────────────────────────────────────────────────────────────
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [step, setStep] = useState<AnalyzeStep>('idle');
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState('');

  const [results, setResults] = useState<Biomarker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [extractedText, setExtractedText] = useState('');
  const [showExtracted, setShowExtracted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag-and-Drop ─────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  }, []);

  const acceptFile = (f: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(f.type)) {
      setError('Please upload a PDF or image file (JPG/PNG).');
      return;
    }
    setFile(f);
    setStep('idle');
    setError(null);
    setResults([]);
  };

  // ── Analysis ──────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    setStep('extracting');
    setProgress(0);
    setError(null);
    setResults([]);
    setExtractedText('');

    try {
      setStepLabel('📄 Reading document...');
      const response = await analyzeReportClient(file!, (p) => {
        setProgress(p);
        if (p < 65) setStepLabel('🔍 Extracting text with OCR...');
        else if (p < 85) setStepLabel('🧠 Detecting biomarkers...');
        else setStepLabel('✨ Generating insights...');
      });

      setExtractedText(response.extractedText ?? '');
      applyResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze report. Please try again.');
      setStep('error');
    }
  };

  const handleAnalyzeText = async () => {
    if (!pastedText.trim()) return;
    setStep('processing');
    setProgress(50);
    setStepLabel('🧠 Detecting biomarkers...');
    setError(null);
    setResults([]);

    try {
      // Small delay to show processing state
      await new Promise(r => setTimeout(r, 400));
      const response = analyzeTextDirect(pastedText);
      setExtractedText(pastedText);
      applyResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze text.');
      setStep('error');
    }
  };

  const handleDemo = async () => {
    setPastedText(DEMO_REPORT_TEXT);
    setInputMode('paste');
    await new Promise(r => setTimeout(r, 100));
    setStep('processing');
    setProgress(50);
    setStepLabel('🧠 Processing demo report...');
    setError(null);
    setResults([]);

    await new Promise(r => setTimeout(r, 600));
    const response = analyzeTextDirect(DEMO_REPORT_TEXT);
    setExtractedText(DEMO_REPORT_TEXT);
    applyResults(response);
  };

  const applyResults = (response: any) => {
    const converted: Biomarker[] = response.biomarkers.map((bio: any) => ({
      name: bio.name,
      value: bio.value,
      unit: bio.unit,
      referenceRange: { min: bio.reference_range.min, max: bio.reference_range.max },
      status: bio.status,
      category: bio.category,
      explanation: bio.explanation,
      implications: bio.implications,
    }));
    setResults(converted);
    setSummary(response.summary || '');
    setRecommendations(response.recommendations || []);
    setProgress(100);
    setStep('done');
  };

  const reset = () => {
    setFile(null);
    setPastedText('');
    setResults([]);
    setSummary('');
    setRecommendations([]);
    setExtractedText('');
    setError(null);
    setStep('idle');
    setProgress(0);
  };

  // ── Status Helpers ─────────────────────────────────────────────────────
  const getStatusIcon = (status: string) => {
    if (status === 'normal') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (status === 'low') return <TrendingDown className="w-5 h-5 text-amber-500" />;
    if (status === 'high') return <TrendingUp className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const getStatusGradient = (status: string) => {
    if (status === 'normal') return 'from-emerald-400 to-green-500';
    if (status === 'low') return 'from-amber-400 to-orange-500';
    if (status === 'high') return 'from-red-400 to-rose-500';
    return 'from-gray-300 to-gray-400';
  };

  const getStatusBg = (status: string) => {
    if (status === 'normal') return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    if (status === 'low') return 'bg-amber-50 border-amber-200 text-amber-800';
    if (status === 'high') return 'bg-red-50 border-red-200 text-red-800';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const getValuePercent = (value: number, range: { min: number; max: number }) => {
    const span = range.max - range.min;
    if (span <= 0) return 50;
    const pct = ((value - range.min) / span) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const categorized = results.reduce((acc, b) => {
    (acc[b.category] ??= []).push(b);
    return acc;
  }, {} as Record<string, Biomarker[]>);

  const stats = {
    total: results.length,
    normal: results.filter(b => b.status === 'normal').length,
    low: results.filter(b => b.status === 'low').length,
    high: results.filter(b => b.status === 'high').length,
  };

  const isAnalyzing = step === 'extracting' || step === 'processing';
  const isDone = step === 'done';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <Activity className="w-4 h-4" />
          AI-Powered Medical Report Analysis
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-500 bg-clip-text text-transparent">
          Report Analyzer
        </h2>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          Upload your lab report or paste the text to get instant AI-powered educational insights on your biomarkers.
        </p>
      </div>

      {/* Error */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50 shadow-sm">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Input Card */}
      {!isDone && (
        <Card className="mb-8 overflow-hidden shadow-xl border-0 ring-1 ring-teal-100">
          {/* Mode Tabs */}
          <div className="flex border-b border-teal-100 bg-gray-50/50">
            <button
              onClick={() => setInputMode('upload')}
              className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                inputMode === 'upload'
                  ? 'bg-white text-teal-700 border-b-2 border-teal-500'
                  : 'text-gray-500 hover:text-teal-600'
              }`}
            >
              <Upload className="w-4 h-4" /> Upload File
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                inputMode === 'paste'
                  ? 'bg-white text-teal-700 border-b-2 border-teal-500'
                  : 'text-gray-500 hover:text-teal-600'
              }`}
            >
              <Clipboard className="w-4 h-4" /> Paste Text
            </button>
          </div>

          <div className="p-8">
            {/* ── Upload Mode ── */}
            {inputMode === 'upload' && (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !file && fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group ${
                  isDragging
                    ? 'border-teal-400 bg-teal-50 scale-[1.01]'
                    : file
                    ? 'border-teal-300 bg-teal-50/50'
                    : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => e.target.files?.[0] && acceptFile(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                />
                <div className="p-10 text-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg transition-all ${
                    isDragging ? 'bg-teal-500 scale-110' : 'bg-gradient-to-br from-teal-500 to-cyan-600 group-hover:scale-105'
                  }`}>
                    <Upload className="w-9 h-9 text-white" />
                  </div>

                  {file ? (
                    <div>
                      <div className="inline-flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow border border-teal-200 mb-4">
                        <FileText className="w-5 h-5 text-teal-600" />
                        <span className="text-sm font-semibold text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <p className="text-sm text-gray-500">Click to change file</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xl font-bold text-gray-700 mb-2">
                        {isDragging ? 'Drop it here!' : 'Drag & Drop your report'}
                      </p>
                      <p className="text-gray-500 text-sm mb-4">or click to browse</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {['PDF', 'JPG', 'PNG'].map(f => (
                          <span key={f} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                            {f}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Paste Mode ── */}
            {inputMode === 'paste' && (
              <div>
                <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Copy all text from your lab report and paste it below
                </p>
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Paste your lab report text here...&#10;&#10;Example:&#10;Hemoglobin   12.5 g/dL&#10;TSH          0.8 mIU/mL&#10;Glucose      95 mg/dL"
                  className="w-full h-52 p-4 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-mono text-gray-700 resize-none transition-all bg-gray-50"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {pastedText.length} characters
                </p>
              </div>
            )}

            {/* Progress Bar */}
            {isAnalyzing && (
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-teal-700 font-medium">{stepLabel}</span>
                  <span className="text-gray-500">{progress}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 justify-center">
              {inputMode === 'upload' && file && (
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  size="lg"
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg px-8 font-semibold"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="mr-2 h-5 w-5" />
                      Analyze Report
                    </>
                  )}
                </Button>
              )}

              {inputMode === 'paste' && pastedText.trim() && (
                <Button
                  onClick={handleAnalyzeText}
                  disabled={isAnalyzing}
                  size="lg"
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg px-8 font-semibold"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="mr-2 h-5 w-5" />
                      Analyze Text
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={handleDemo}
                disabled={isAnalyzing}
                variant="outline"
                size="lg"
                className="border-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-400 shadow-sm px-8 font-semibold"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Try Demo Report
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {isDone && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Biomarkers', value: stats.total, color: 'from-teal-500 to-cyan-500', text: 'text-white' },
              { label: 'Normal Range', value: stats.normal, color: 'from-emerald-400 to-green-500', text: 'text-white' },
              { label: 'Below Normal', value: stats.low, color: 'from-amber-400 to-orange-400', text: 'text-white' },
              { label: 'Above Normal', value: stats.high, color: 'from-red-400 to-rose-500', text: 'text-white' },
            ].map(s => (
              <Card
                key={s.label}
                className={`p-5 bg-gradient-to-br ${s.color} border-0 shadow-lg text-white`}
              >
                <div className="text-3xl font-extrabold mb-1">{s.value}</div>
                <div className="text-sm opacity-90 font-medium">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Summary */}
          {summary && (
            <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-teal-50 to-cyan-50 ring-1 ring-teal-100">
              <h3 className="text-lg font-bold text-teal-900 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5" /> Analysis Summary
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{summary}</p>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 ring-1 ring-purple-100">
              <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Personalized Recommendations
              </h3>
              <ul className="space-y-2">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" />
                    <span className="text-gray-700 text-sm leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Detailed Results */}
          {Object.keys(categorized).length > 0 && (
            <Card className="p-6 border-0 shadow-xl ring-1 ring-gray-100">
              <h3 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                <FlaskConical className="w-6 h-6 text-teal-600" />
                Detailed Analysis
              </h3>
              <Tabs defaultValue={Object.keys(categorized)[0]} className="w-full">
                <TabsList className="flex flex-wrap gap-1.5 mb-6 h-auto bg-gray-100/80 p-1.5 rounded-xl">
                  {Object.keys(categorized).map(cat => (
                    <TabsTrigger
                      key={cat}
                      value={cat}
                      className="text-xs capitalize data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-1.5"
                    >
                      {cat}
                      <span className="ml-1.5 text-[10px] opacity-70">({categorized[cat].length})</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(categorized).map(([cat, bms]) => (
                  <TabsContent key={cat} value={cat} className="space-y-4">
                    {bms.map((bm, idx) => (
                      <BiomarkerCard
                        key={idx}
                        bm={bm}
                        getStatusIcon={getStatusIcon}
                        getStatusGradient={getStatusGradient}
                        getStatusBg={getStatusBg}
                        getValuePercent={getValuePercent}
                      />
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          )}

          {/* Extracted Text Toggle */}
          {extractedText && (
            <Card className="p-5 border-0 shadow ring-1 ring-gray-100">
              <button
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-600 hover:text-teal-600 transition-colors"
                onClick={() => setShowExtracted(x => !x)}
              >
                <span className="flex items-center gap-2">
                  {showExtracted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showExtracted ? 'Hide' : 'Show'} Extracted Text ({extractedText.length} chars)
                </span>
                {showExtracted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showExtracted && (
                <pre className="mt-4 p-4 bg-gray-50 rounded-xl text-xs text-gray-600 overflow-x-auto max-h-64 font-mono border border-gray-200 whitespace-pre-wrap">
                  {extractedText}
                </pre>
              )}
            </Card>
          )}

          {/* Disclaimer */}
          <Alert className="border-blue-200 bg-blue-50 shadow-sm">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Disclaimer:</strong> This analysis is for <em>educational purposes only</em> and does not constitute medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals.
            </AlertDescription>
          </Alert>

          {/* Reset */}
          <div className="text-center">
            <Button onClick={reset} variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
              ← Analyze Another Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Biomarker Card Sub-Component ────────────────────────────────────────────

function BiomarkerCard({
  bm,
  getStatusIcon,
  getStatusGradient,
  getStatusBg,
  getValuePercent,
}: {
  bm: Biomarker;
  getStatusIcon: (s: string) => React.ReactNode;
  getStatusGradient: (s: string) => string;
  getStatusBg: (s: string) => string;
  getValuePercent: (v: number, r: { min: number; max: number }) => number;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = getValuePercent(bm.value, bm.referenceRange);

  return (
    <Card className="p-5 border-0 shadow-md ring-1 ring-gray-100 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {getStatusIcon(bm.status)}
          <div className="min-w-0">
            <h4 className="text-base font-bold text-gray-800 truncate">{bm.name}</h4>
            <Badge className={`${getStatusBg(bm.status)} border text-xs mt-1 capitalize font-semibold`}>
              {bm.status}
            </Badge>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-extrabold text-gray-900">
            {bm.value}
            <span className="text-sm text-gray-500 ml-1 font-normal">{bm.unit}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Normal: {bm.referenceRange.min}–{bm.referenceRange.max}
          </div>
        </div>
      </div>

      {/* Gauge */}
      <div className="relative mb-4">
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          {/* Normal range highlight */}
          <div className="absolute inset-0 flex">
            <div className="h-full bg-gray-100" style={{ width: '0%' }} />
            <div className="h-full bg-emerald-100" style={{ width: '100%' }} />
          </div>
          {/* Value indicator */}
          <div
            className={`relative h-full bg-gradient-to-r ${getStatusGradient(bm.status)} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className="absolute -top-0.5 w-3.5 h-3.5 bg-white border-2 border-gray-400 rounded-full shadow-md -translate-x-1/2 transition-all duration-700"
          style={{ left: `${pct}%` }}
        />
      </div>

      {/* Explanation */}
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{bm.explanation}</p>

      {/* Implications toggle */}
      {bm.implications.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-teal-600 font-semibold hover:text-teal-800 flex items-center gap-1 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide' : 'Show'} implications
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1.5 pl-1">
              {bm.implications.map((imp, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="text-teal-500 mt-0.5">•</span>
                  {imp}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
