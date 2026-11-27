/**
 * TypeScript type definitions for Module 4: Emergency Case Identification & Critical Triage.
 */

export type UrgencyTier =
  | "CRITICAL_EMERGENCY"
  | "HIGH_URGENCY"
  | "MODERATE_PRIORITY"
  | "NON_EMERGENCY";

export interface VitalSignsInput {
  heart_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  respiratory_rate?: number;
  spo2?: number;
  temperature?: number;
  blood_glucose?: number;
}

export interface EmergencyRedFlag {
  flag_id: string;
  category: string;
  severity: "CRITICAL_EMERGENCY" | "URGENT_EVALUATION";
  title: string;
  matched_triggers: string[];
  clinical_rationale: string;
  action_required: string;
}

export interface EmergencyAssessmentRequest {
  symptoms: string[];
  vitals?: VitalSignsInput;
  patient_age?: number;
  known_conditions?: string[];
}

export interface EmergencyAssessmentResponse {
  is_emergency: boolean;
  urgency_tier: UrgencyTier;
  risk_score: number;
  primary_emergency_category: string | null;
  red_flags: EmergencyRedFlag[];
  vital_warnings: string[];
  immediate_actions: string[];
  triage_summary: string;
  emergency_hotlines: Record<string, string>;
  recommended_destination: string;
  assessed_at: string;
}
