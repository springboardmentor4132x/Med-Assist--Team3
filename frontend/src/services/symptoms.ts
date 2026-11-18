import type {
  IntegratedSymptomAssessmentResponse,
  SymptomAnalysisResponse,
  SymptomCatalogItem,
  SymptomCategorySummary,
  SymptomInputItem,
  SymptomValidationResponse,
} from "../types/symptoms";
import { authorizedFetch } from "./api";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export async function fetchSymptomsCatalog(params?: {
  search?: string;
  category?: string;
  is_red_flag?: boolean;
}): Promise<SymptomCatalogItem[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.category) query.set("category", params.category);
  if (params?.is_red_flag !== undefined) {
    query.set("is_red_flag", String(params.is_red_flag));
  }

  const url = `${API_BASE}/api/v1/symptoms${
    query.toString() ? `?${query.toString()}` : ""
  }`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load symptoms catalog (${response.status})`);
  }
  return response.json();
}

export async function fetchSymptomCategories(): Promise<SymptomCategorySummary[]> {
  const response = await fetch(`${API_BASE}/api/v1/symptoms/categories`);
  if (!response.ok) {
    throw new Error(`Failed to load symptom categories (${response.status})`);
  }
  return response.json();
}

export async function validateSymptoms(
  symptoms: SymptomInputItem[]
): Promise<SymptomValidationResponse> {
  const response = await fetch(`${API_BASE}/api/v1/symptoms/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Validation failed (${response.status})`);
  }
  return response.json();
}

export async function analyzeSymptoms(
  symptoms: SymptomInputItem[],
  patientId?: number
): Promise<SymptomAnalysisResponse> {
  const response = await fetch(`${API_BASE}/api/v1/symptoms/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptoms, patient_id: patientId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Analysis failed (${response.status})`);
  }
  return response.json();
}

export async function submitSelectedSymptoms(
  symptoms: SymptomInputItem[]
): Promise<IntegratedSymptomAssessmentResponse> {
  return authorizedFetch<IntegratedSymptomAssessmentResponse>(
    "/api/v1/symptoms/submit",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symptoms }),
    }
  );
}

export async function fetchMySymptomAssessments(): Promise<
  IntegratedSymptomAssessmentResponse[]
> {
  return authorizedFetch<IntegratedSymptomAssessmentResponse[]>(
    "/api/v1/symptoms/assessments/me"
  );
}

export async function fetchPatientSymptomAssessments(
  patientId: number
): Promise<IntegratedSymptomAssessmentResponse[]> {
  return authorizedFetch<IntegratedSymptomAssessmentResponse[]>(
    `/api/v1/symptoms/assessments/patient/${patientId}`
  );
}