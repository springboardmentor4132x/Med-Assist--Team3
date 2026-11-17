export type SmokingStatus = "never" | "former" | "current";
export type AlcoholConsumption = "none" | "occasional" | "moderate" | "heavy";
export type PhysicalActivity = "sedentary" | "light" | "moderate" | "active";

export interface MedicationItem {
  name: string;
  dosage?: string | null;
  frequency?: string | null;
}

export interface SurgeryItem {
  procedure: string;
  year?: number | null;
  notes?: string | null;
}

export interface LifestyleFactors {
  smoking_status?: SmokingStatus | null;
  alcohol_consumption?: AlcoholConsumption | null;
  physical_activity?: PhysicalActivity | null;
}

export interface MedicalHistory {
  id: number;
  user_id: number;
  blood_group?: string | null;
  chronic_conditions: string[];
  allergies: string[];
  current_medications: MedicationItem[];
  past_surgeries: SurgeryItem[];
  family_history: string[];
  lifestyle_factors: LifestyleFactors;
  created_at: string;
  updated_at: string;
}

export interface MedicalHistoryUpdatePayload {
  blood_group?: string | null;
  chronic_conditions?: string[];
  allergies?: string[];
  current_medications?: MedicationItem[];
  past_surgeries?: SurgeryItem[];
  family_history?: string[];
  lifestyle_factors?: LifestyleFactors;
}

