import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { analyzeReportClient } from '../../lib/clientProcessor';

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

export default function ReportAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Biomarker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setAnalyzed(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setAnalyzing(true);
    setProgress(0);
    setError(null);

    try {
      // Process directly in browser - no backend needed
      const response = await analyzeReportClient(file, (progress) => {
        setProgress(progress);
      });
      
      // Convert response to component format
      const convertedBiomarkers: Biomarker[] = response.biomarkers.map((bio) => ({
        name: bio.name,
        value: bio.value,
        unit: bio.unit,
        referenceRange: {
          min: bio.reference_range.min,
          max: bio.reference_range.max
        },
        status: bio.status,
        category: bio.category,
        explanation: bio.explanation,
        implications: bio.implications
      }));
      
      setResults(convertedBiomarkers);
      setSummary(response.summary || '');
      setRecommendations(response.recommendations || []);
      setAnalyzed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze report. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'low':
        return <TrendingDown className="w-5 h-5 text-orange-600" />;
      case 'high':
        return <TrendingUp className="w-5 h-5 text-red-600" />;
      default:
        return <Minus className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'low':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getProgressColor = (value: number, range: { min: number; max: number }) => {
    const percentage = ((value - range.min) / (range.max - range.min)) * 100;
    if (percentage < 40) return 'bg-orange-500';
    if (percentage > 80) return 'bg-red-500';
    return 'bg-green-500';
  };

  const categorizedResults = results.reduce((acc, biomarker) => {
    if (!acc[biomarker.category]) {
      acc[biomarker.category] = [];
    }
    acc[biomarker.category].push(biomarker);
    return acc;
  }, {} as Record<string, Biomarker[]>);

  const summaryStats = {
    total: results.length,
    normal: results.filter(b => b.status === 'normal').length,
    low: results.filter(b => b.status === 'low').length,
    high: results.filter(b => b.status === 'high').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Medical Report Analyzer
          </span>
        </h2>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Upload your lab report to get instant analysis with explanations and personalized recommendations
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-8 border-red-200 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <Card className="p-8 mb-8 border-2 border-dashed border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Upload className="w-10 h-10 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Upload Your Medical Report</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Supports PDF and image formats. Your data is processed securely and not stored.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                size="lg"
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg"
                asChild
              >
                <span>
                  <FileText className="mr-2 h-5 w-5" />
                  Choose File
                </span>
              </Button>
            </label>
            
            {file && (
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
              >
                {analyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  'Start Analysis'
                )}
              </Button>
            )}
          </div>

          {file && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-teal-200">
              <FileText className="w-5 h-5 text-teal-600" />
              <span className="text-sm font-medium text-gray-700">{file.name}</span>
            </div>
          )}

          {analyzing && (
            <div className="mt-6 max-w-md mx-auto">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-gray-600 mt-2">{progress}% Complete</p>
            </div>
          )}
        </div>
      </Card>

      {/* Results Section */}
      {analyzed && results.length > 0 && (
        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-6 border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total Biomarkers</div>
              <div className="text-3xl font-bold text-gray-900">{summaryStats.total}</div>
            </Card>
            <Card className="p-6 border-green-200 bg-green-50">
              <div className="text-sm text-green-600 mb-1">Normal Range</div>
              <div className="text-3xl font-bold text-green-700">{summaryStats.normal}</div>
            </Card>
            <Card className="p-6 border-orange-200 bg-orange-50">
              <div className="text-sm text-orange-600 mb-1">Below Normal</div>
              <div className="text-3xl font-bold text-orange-700">{summaryStats.low}</div>
            </Card>
            <Card className="p-6 border-red-200 bg-red-50">
              <div className="text-sm text-red-600 mb-1">Above Normal</div>
              <div className="text-3xl font-bold text-red-700">{summaryStats.high}</div>
            </Card>
          </div>

          {/* Overall Summary */}
          {summary && (
            <Card className="p-6 border-teal-200 bg-teal-50">
              <h3 className="text-xl font-bold text-teal-900 mb-3">Overall Summary</h3>
              <p className="text-gray-700 leading-relaxed">{summary}</p>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card className="p-6 border-purple-200 bg-purple-50">
              <h3 className="text-xl font-bold text-purple-900 mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Detailed Results */}
          <Card className="p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Detailed Analysis</h3>
            
            <Tabs defaultValue={Object.keys(categorizedResults)[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
                {Object.keys(categorizedResults).map((category) => (
                  <TabsTrigger key={category} value={category} className="capitalize text-sm">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {Object.entries(categorizedResults).map(([category, biomarkers]) => (
                <TabsContent key={category} value={category} className="space-y-4">
                  {biomarkers.map((biomarker, index) => (
                    <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(biomarker.status)}
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-800 mb-1">{biomarker.name}</h4>
                            <Badge className={`${getStatusColor(biomarker.status)} capitalize`}>
                              {biomarker.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {biomarker.value} <span className="text-sm text-gray-600">{biomarker.unit}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Normal: {biomarker.referenceRange.min}-{biomarker.referenceRange.max} {biomarker.unit}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(biomarker.value, biomarker.referenceRange)}`}
                            style={{
                              width: `${Math.min(
                                ((biomarker.value - biomarker.referenceRange.min) /
                                  (biomarker.referenceRange.max - biomarker.referenceRange.min)) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 leading-relaxed">{biomarker.explanation}</p>
                      </div>

                      {/* Implications */}
                      {biomarker.implications.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-gray-800 mb-2 text-sm">What this means:</h5>
                          <ul className="space-y-1">
                            {biomarker.implications.map((implication, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="text-teal-600 mt-1">•</span>
                                <span>{implication}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Card>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </Card>

          {/* Disclaimer */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Disclaimer:</strong> This analysis is for educational purposes only. Always consult with healthcare professionals for medical advice, diagnosis, or treatment.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
