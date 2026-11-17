import { authorizedFetch } from "./api";
import type {
  MedicalHistory,
  MedicalHistoryUpdatePayload,
} from "../types/medicalHistory";

export async function getMyMedicalHistoryRequest(): Promise<MedicalHistory> {
  return authorizedFetch<MedicalHistory>("/api/v1/medical-history/me");
}

export async function updateMyMedicalHistoryRequest(
  payload: MedicalHistoryUpdatePayload
): Promise<MedicalHistory> {
  return authorizedFetch<MedicalHistory>("/api/v1/medical-history/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getPatientMedicalHistoryRequest(
  patientId: number
): Promise<MedicalHistory> {
  return authorizedFetch<MedicalHistory>(
    `/api/v1/medical-history/patient/${patientId}`
  );
}