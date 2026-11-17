import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Droplet,
  FileHeart,
  Pill,
  Scissors,
  Search,
  Stethoscope,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../services/api";
import { getPatientMedicalHistoryRequest } from "../services/medicalHistory";
import type { MedicalHistory } from "../types/medicalHistory";

export function PatientMedicalHistoryViewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patientIdInput, setPatientIdInput] = useState("");
  const [history, setHistory] = useState<MedicalHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const parsedId = Number(patientIdInput.trim());

    if (!parsedId || parsedId <= 0) {
      setError("Please enter a valid numeric Patient ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setHistory(null);

    try {
      const data = await getPatientMedicalHistoryRequest(parsedId);
      setHistory(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to retrieve patient medical history."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">MedAssist AI</h1>
              <p className="text-xs capitalize text-slate-500">
                {user?.role} Portal — Patient Record Lookup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Patient Medical History (Read-Only)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter a Patient ID to review their baseline conditions, allergies, medications, and lifestyle risks.
          </p>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <input
            type="number"
            min={1}
            value={patientIdInput}
            onChange={(e) => setPatientIdInput(e.target.value)}
            placeholder="Enter Patient User ID (e.g., 1)"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {loading ? "Searching..." : "View Record"}
          </button>
        </form>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {history && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-900">
              <span>
                Showing medical history for <strong>Patient #{history.user_id}</strong>
              </span>
              <span>
                Last updated: {new Date(history.updated_at).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Droplet className="h-4 w-4 text-teal-700" />
                  Blood Group
                </div>
                <p className="mt-3 text-lg font-bold text-slate-900">
                  {history.blood_group || "Not specified"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Activity className="h-4 w-4 text-teal-700" />
                  Lifestyle Indicators
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                  <li>
                    <span className="font-semibold text-slate-900">Smoking:</span>{" "}
                    <span className="capitalize">
                      {history.lifestyle_factors?.smoking_status || "Not set"}
                    </span>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Alcohol:</span>{" "}
                    <span className="capitalize">
                      {history.lifestyle_factors?.alcohol_consumption || "Not set"}
                    </span>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Activity:</span>{" "}
                    <span className="capitalize">
                      {history.lifestyle_factors?.physical_activity || "Not set"}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <FileHeart className="h-4 w-4 text-teal-700" />
                  Chronic Conditions
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {history.chronic_conditions.length > 0 ? (
                    history.chronic_conditions.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">None recorded</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Allergies
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {history.allergies.length > 0 ? (
                    history.allergies.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">None recorded</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Pill className="h-4 w-4 text-teal-700" />
                  Current Medications
                </div>
                {history.current_medications.length > 0 ? (
                  <ul className="mt-3 divide-y divide-slate-100 text-sm">
                    {history.current_medications.map((med, idx) => (
                      <li key={idx} className="flex justify-between py-2.5">
                        <span className="font-semibold text-slate-900">
                          {med.name}
                        </span>
                        <span className="text-slate-500">
                          {[med.dosage, med.frequency]
                            .filter(Boolean)
                            .join(" • ") || "Dosage not specified"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    No active medications recorded
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Scissors className="h-4 w-4 text-teal-700" />
                  Past Surgeries
                </div>
                {history.past_surgeries.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                    {history.past_surgeries.map((s, idx) => (
                      <li key={idx}>
                        <span className="font-medium text-slate-900">
                          {s.procedure}
                        </span>{" "}
                        {s.year ? `(${s.year})` : ""}
                        {s.notes ? ` — ${s.notes}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">None recorded</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Users className="h-4 w-4 text-teal-700" />
                  Family Medical History
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {history.family_history.length > 0 ? (
                    history.family_history.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">None recorded</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}