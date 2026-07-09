/**
 * API Client for HealthDecode Backend
 * Handles all communication with the FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export interface Biomarker {
  name: string;
  value: number;
  unit: string;
  reference_range: {
    min: number;
    max: number;
    unit: string;
  };
  status: 'normal' | 'low' | 'high';
  category: string;
  explanation: string;
  implications: string[];
}

export interface AnalysisResponse {
  success: boolean;
  extracted_text?: string;
  biomarkers: Biomarker[];
  summary?: string;
  recommendations: string[];
  disclaimer: string;
}

export interface NutrientInfo {
  id: string;
  name: string;
  category: 'vitamin' | 'mineral';
  description: string;
  benefits: string[];
  deficiency_symptoms: string[];
  sources: string[];
  reference_range: string;
  daily_requirement: string;
  color: string;
}

export interface SearchResponse {
  success: boolean;
  results: NutrientInfo[];
  total_count: number;
}

/**
 * Analyze uploaded medical report
 */
export async function analyzeReport(
  file: File,
  extractOnly: boolean = false
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('extract_only', String(extractOnly));

  const response = await fetch(`${API_BASE_URL}/analyzer/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to analyze report');
  }

  return response.json();
}

/**
 * Analyze text directly (without file upload)
 */
export async function analyzeText(text: string): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/analyzer/analyze-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to analyze text');
  }

  return response.json();
}

/**
 * Get all nutrients from knowledge base
 */
export async function getAllNutrients(): Promise<NutrientInfo[]> {
  const response = await fetch(`${API_BASE_URL}/knowledge/nutrients`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch nutrients');
  }

  return response.json();
}

/**
 * Get specific nutrient by ID
 */
export async function getNutrient(id: string): Promise<NutrientInfo> {
  const response = await fetch(`${API_BASE_URL}/knowledge/nutrients/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch nutrient');
  }

  return response.json();
}

/**
 * Search knowledge base
 */
export async function searchKnowledge(
  query: string,
  category?: 'vitamin' | 'mineral'
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (category) {
    params.append('category', category);
  }

  const response = await fetch(`${API_BASE_URL}/knowledge/search?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Search failed');
  }

  return response.json();
}

/**
 * Get nutrients by category
 */
export async function getNutrientsByCategory(
  category: 'vitamin' | 'mineral'
): Promise<NutrientInfo[]> {
  const response = await fetch(`${API_BASE_URL}/knowledge/categories/${category}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch category');
  }

  return response.json();
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<{
  status: string;
  services: Record<string, boolean>;
  version: string;
}> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
}

/**
 * Get disclaimer text
 */
export async function getDisclaimer(): Promise<{ disclaimer: string }> {
  const response = await fetch(`${API_BASE_URL}/knowledge/disclaimer`);

  if (!response.ok) {
    throw new Error('Failed to fetch disclaimer');
  }

  return response.json();
}
