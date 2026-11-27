/**
 * API client service for Module 4: Emergency Case Identification & Critical Triage.
 */

import type {
  EmergencyAssessmentRequest,
  EmergencyAssessmentResponse,
} from "../types/emergency";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export async function evaluateEmergencyTriage(
  payload: EmergencyAssessmentRequest
): Promise<EmergencyAssessmentResponse> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/v1/emergency/evaluate`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Emergency triage assessment failed (${response.status})`);
  }

  return response.json();
}

export async function fetchEmergencyRedFlagsCatalog(): Promise<{
  emergency_hotlines: Record<string, string>;
  critical_syndromes: Array<{
    id: string;
    name: string;
    key_symptoms: string[];
    protocol: string;
  }>;
}> {
  const response = await fetch(`${API_BASE}/api/v1/emergency/red-flags`);
  if (!response.ok) {
    throw new Error(`Failed to load emergency red-flags catalog (${response.status})`);
  }
  return response.json();
}
