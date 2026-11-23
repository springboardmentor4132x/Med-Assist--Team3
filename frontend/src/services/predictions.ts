/**
 * API client service for Module 3: Disease Prediction and ML Diagnostic Scoring.
 */

import type {
  ComprehensivePredictionResponse,
  DifferentialDiagnosisResponse,
  DiseaseClassificationResponse,
  DiseaseProbabilityResponse,
  PredictionConfidenceDetails,
} from "../types/predictions";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export async function classifyDisease(symptoms: string[]): Promise<DiseaseClassificationResponse> {
  const response = await fetch(`${API_BASE}/api/v1/predictions/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Disease classification failed (${response.status})`);
  }
  return response.json();
}

export async function fetchDiseaseProbabilities(
  symptoms: string[]
): Promise<DiseaseProbabilityResponse> {
  const response = await fetch(`${API_BASE}/api/v1/predictions/probabilities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Probability generation failed (${response.status})`);
  }
  return response.json();
}

export async function fetchDifferentialDiagnosis(
  symptoms: string[]
): Promise<DifferentialDiagnosisResponse> {
  const response = await fetch(`${API_BASE}/api/v1/predictions/differential`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Differential diagnosis failed (${response.status})`);
  }
  return response.json();
}

export async function fetchPredictionConfidence(
  symptoms: string[]
): Promise<PredictionConfidenceDetails> {
  const response = await fetch(`${API_BASE}/api/v1/predictions/confidence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Confidence scoring failed (${response.status})`);
  }
  return response.json();
}

export async function fetchComprehensivePrediction(
  symptoms: string[]
): Promise<ComprehensivePredictionResponse> {
  const response = await fetch(`${API_BASE}/api/v1/predictions/comprehensive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Comprehensive prediction failed (${response.status})`);
  }
  return response.json();
}
