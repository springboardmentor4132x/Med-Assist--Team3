import type { LifestyleFactors, MedicationItem, SurgeryItem } from "./medicalHistory";
export type SymptomSeverity = "mild" | "moderate" | "severe";
export type ClusterCoherence = "high" | "moderate" | "low";

export interface SymptomInputItem {
  symptom_id: string;
  severity: SymptomSeverity;
  duration_days: number;
}

export interface ValidatedSymptom {
  symptom_id: string;
  name: string;
  category: string;
  severity: SymptomSeverity;
  duration_days: number;
  clinical_weight: number;
  is_red_flag: boolean;
  description: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
  symptom_id?: string;
}

export interface SymptomValidationResponse {
  is_valid: boolean;
  total_submitted: number;
  validated_symptoms: ValidatedSymptom[];
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
}

export interface SymptomCorrelationItem {
  symptom_a: string;
  symptom_b: string;
  correlation_score: number;
  co_occurrence_count: number;
  clinical_relevance: string;
}

export interface SuggestedSymptom {
  symptom_id: string;
  name: string;
  category: string;
  correlation_score: number;
  reason: string;
}

export interface SymptomAnalysisResponse {
  session_id: string;
  created_at: string;
  validated_symptoms: ValidatedSymptom[];
  has_red_flags: boolean;
  red_flag_symptoms: string[];
  cluster_coherence: ClusterCoherence;
  top_correlated_pairs: SymptomCorrelationItem[];
  suggested_co_occurring_symptoms: SuggestedSymptom[];
  primary_affected_systems: string[];
  potential_disease_categories: string[];
}

export interface SymptomCatalogItem {
  id: string;
  name: string;
  category: string;
  clinical_weight: number;
  is_red_flag: boolean;
  aliases: string[];
  description: string;
}

export interface SymptomCategorySummary {
  category: string;
  symptom_count: number;
  sample_symptoms: string[];
}

export interface MedicalHistoryContext {
  medical_history_id: number;
  blood_group: string | null;
  chronic_conditions: string[];
  allergies: string[];
  current_medications: MedicationItem[];
  past_surgeries: SurgeryItem[];
  family_history: string[];
  lifestyle_factors: LifestyleFactors;
  previous_assessments_count: number;
  history_last_updated_at: string | null;
}

export interface IntegratedSymptomAssessmentResponse {
  assessment_id: number;
  user_id: number;
  created_at: string;
  validated_symptoms: ValidatedSymptom[];
  warnings: ValidationIssue[];
  has_red_flags: boolean;
  red_flag_symptoms: string[];
  cluster_coherence: ClusterCoherence;
  top_correlated_pairs: SymptomCorrelationItem[];
  suggested_co_occurring_symptoms: SuggestedSymptom[];
  primary_affected_systems: string[];
  potential_disease_categories: string[];
  medical_history_context: MedicalHistoryContext;
}