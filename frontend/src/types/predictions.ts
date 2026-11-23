/**
 * TypeScript type definitions for Module 3: Disease Prediction and ML Diagnostic Engine.
 */

export type UrgencyLevel = "low" | "moderate" | "high" | "emergency";
export type ConfidenceTier = "High" | "Moderate" | "Low";

export interface DiseaseClassificationResponse {
  predicted_disease: string;
  display_name: string;
  category: string;
  icd10: string;
  urgency_level: UrgencyLevel;
  description: string;
  matched_symptoms: string[];
  primary_symptoms_matched: string[];
  total_symptoms_evaluated: number;
  match_ratio: number;
}

export interface DiseaseProbabilityItem {
  disease: string;
  display_name: string;
  category: string;
  icd10: string;
  urgency_level: UrgencyLevel;
  probability: number;
  probability_percent: number;
  matched_symptoms: string[];
  primary_symptoms_matched: string[];
}

export interface DiseaseProbabilityResponse {
  top_prediction: DiseaseProbabilityItem;
  probabilities: DiseaseProbabilityItem[];
  total_conditions_evaluated: number;
  evaluated_symptoms: string[];
  dominant_category: string;
}

export interface DifferentialCandidate {
  rank: number;
  disease: string;
  display_name: string;
  category: string;
  icd10: string;
  urgency_level: UrgencyLevel;
  probability: number;
  probability_percent: number;
  matched_symptoms: string[];
  missing_hallmark_symptoms: string[];
  clinical_rationale: string;
  recommended_diagnostic_tests: string[];
}

export interface DifferentialDiagnosisResponse {
  query_symptoms: string[];
  candidates: DifferentialCandidate[];
  highest_urgency: UrgencyLevel;
  total_candidates: number;
  clinical_triage_guidance: string;
}

export interface PredictionConfidenceDetails {
  confidence_score: number;
  confidence_percent: number;
  confidence_level: ConfidenceTier;
  margin_of_separation: number;
  symptom_coverage: number;
  hallmark_symptoms_present: number;
  ambiguity_flag: boolean;
  clinical_recommendation: string;
}

export interface ComprehensivePredictionResponse {
  classification: DiseaseClassificationResponse;
  probabilities: DiseaseProbabilityItem[];
  differential_diagnoses: DifferentialCandidate[];
  confidence: PredictionConfidenceDetails;
  triage_urgency: UrgencyLevel;
  clinical_summary: string;
}
