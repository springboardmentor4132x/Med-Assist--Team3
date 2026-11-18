import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Droplet,
  FileHeart,
  Pencil,
  Pill,
  Plus,
  Save,
  Scissors,
  Users,
  X,
} from "lucide-react";
import { AppNavbar } from "../components/AppNavbar";
import { ApiError } from "../services/api";
import {
  getMyMedicalHistoryRequest,
  updateMyMedicalHistoryRequest,
} from "../services/medicalHistory";
import type {
  AlcoholConsumption,
  MedicalHistory,
  MedicationItem,
  PhysicalActivity,
  SmokingStatus,
  SurgeryItem,
} from "../types/medicalHistory";

const COMMON_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Asthma",
  "Heart Disease",
  "Thyroid Disorder",
  "Migraine",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function MedicalHistoryPage() {
  const [history, setHistory] = useState<MedicalHistory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);
  const [familyInput, setFamilyInput] = useState("");
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [surgeries, setSurgeries] = useState<SurgeryItem[]>([]);
  const [smokingStatus, setSmokingStatus] = useState<SmokingStatus | "">("");
  const [alcoholConsumption, setAlcoholConsumption] = useState<
    AlcoholConsumption | ""
  >("");
  const [physicalActivity, setPhysicalActivity] = useState<
    PhysicalActivity | ""
  >("");

  const syncFormWithData = (data: MedicalHistory) => {
    setBloodGroup(data.blood_group ?? "");
    setChronicConditions(data.chronic_conditions ?? []);
    setAllergies(data.allergies ?? []);
    setFamilyHistory(data.family_history ?? []);
    setMedications(data.current_medications ?? []);
    setSurgeries(data.past_surgeries ?? []);
    setSmokingStatus(data.lifestyle_factors?.smoking_status ?? "");
    setAlcoholConsumption(data.lifestyle_factors?.alcohol_consumption ?? "");
    setPhysicalActivity(data.lifestyle_factors?.physical_activity ?? "");
  };

  useEffect(() => {
    let active = true;

    async function fetchHistory() {
      try {
        setLoading(true);
        const data = await getMyMedicalHistoryRequest();
        if (active) {
          setHistory(data);
          syncFormWithData(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load medical history."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchHistory();
    return () => {
      active = false;
    };
  }, []);

  const toggleCondition = (condition: string) => {
    setChronicConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  };

  const addTag = (
    value: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    clearInput: () => void
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setter([...list, trimmed]);
    }
    clearInput();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await updateMyMedicalHistoryRequest({
        blood_group: bloodGroup || null,
        chronic_conditions: chronicConditions,
        allergies,
        family_history: familyHistory,
        current_medications: medications.filter((m) => m.name.trim() !== ""),
        past_surgeries: surgeries.filter((s) => s.procedure.trim() !== ""),
        lifestyle_factors: {
          smoking_status: smokingStatus || null,
          alcohol_consumption: alcoholConsumption || null,
          physical_activity: physicalActivity || null,
        },
      });
      setHistory(updated);
      syncFormWithData(updated);
      setIsEditing(false);
      setSuccessMsg("Your medical history has been saved successfully.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save medical history."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-600">
            Loading medical history...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNavbar />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Medical History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Keep your baseline health profile updated for accurate AI symptom analysis.
            </p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setSuccessMsg(null);
                setError(null);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              <Pencil className="h-4 w-4" />
              Edit History
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            {successMsg}
          </div>
        )}

        {!isEditing && history ? (
          /* READ-ONLY SUMMARY VIEW */
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
        ) : (
          /* EDIT FORM VIEW */
          <form
            onSubmit={handleSave}
            className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            {/* Blood Group */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-44 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Select...</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            {/* Chronic Conditions */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Chronic Conditions
              </label>
              <div className="mb-3 flex flex-wrap gap-2">
                {COMMON_CONDITIONS.map((cond) => {
                  const selected = chronicConditions.includes(cond);
                  return (
                    <button
                      type="button"
                      key={cond}
                      onClick={() => toggleCondition(cond)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? "border-teal-700 bg-teal-700 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-400"
                      }`}
                    >
                      {selected ? `✓ ${cond}` : `+ ${cond}`}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCondition}
                  onChange={(e) => setCustomCondition(e.target.value)}
                  placeholder="Add another condition..."
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    addTag(
                      customCondition,
                      chronicConditions,
                      setChronicConditions,
                      () => setCustomCondition("")
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
              {chronicConditions.filter((c) => !COMMON_CONDITIONS.includes(c))
                .length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {chronicConditions
                    .filter((c) => !COMMON_CONDITIONS.includes(c))
                    .map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() =>
                            setChronicConditions(
                              chronicConditions.filter((item) => item !== c)
                            )
                          }
                          className="ml-1 font-bold hover:text-rose-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Allergies */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Allergies
              </label>
              <div className="mb-2.5 flex gap-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  placeholder="e.g., Penicillin, Peanuts"
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    addTag(allergyInput, allergies, setAllergies, () =>
                      setAllergyInput("")
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allergies.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() =>
                        setAllergies(allergies.filter((item) => item !== a))
                      }
                      className="ml-1 font-bold hover:text-rose-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Current Medications */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">
                  Current Medications
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setMedications([
                      ...medications,
                      { name: "", dosage: "", frequency: "" },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Medication
                </button>
              </div>
              <div className="space-y-2.5">
                {medications.map((med, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Medication name"
                      value={med.name}
                      onChange={(e) => {
                        const copy = [...medications];
                        copy[idx] = { ...copy[idx], name: e.target.value };
                        setMedications(copy);
                      }}
                      className="col-span-5 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                    />
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={med.dosage ?? ""}
                      onChange={(e) => {
                        const copy = [...medications];
                        copy[idx] = { ...copy[idx], dosage: e.target.value };
                        setMedications(copy);
                      }}
                      className="col-span-3 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                    />
                    <input
                      type="text"
                      placeholder="Frequency (e.g. Daily)"
                      value={med.frequency ?? ""}
                      onChange={(e) => {
                        const copy = [...medications];
                        copy[idx] = { ...copy[idx], frequency: e.target.value };
                        setMedications(copy);
                      }}
                      className="col-span-3 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMedications(medications.filter((_, i) => i !== idx))
                      }
                      className="col-span-1 flex items-center justify-center text-rose-500 hover:text-rose-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Surgeries */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">
                  Past Surgeries
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSurgeries([
                      ...surgeries,
                      { procedure: "", year: null, notes: "" },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Surgery
                </button>
              </div>
              <div className="space-y-2.5">
                {surgeries.map((surgery, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Procedure name"
                      value={surgery.procedure}
                      onChange={(e) => {
                        const copy = [...surgeries];
                        copy[idx] = { ...copy[idx], procedure: e.target.value };
                        setSurgeries(copy);
                      }}
                      className="col-span-6 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                    />
                    <input
                      type="number"
                      placeholder="Year"
                      min={1900}
                      max={2100}
                      value={surgery.year ?? ""}
                      onChange={(e) => {
                        const copy = [...surgeries];
                        copy[idx] = {
                          ...copy[idx],
                          year: e.target.value ? Number(e.target.value) : null,
                        };
                        setSurgeries(copy);
                      }}
                      className="col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                    />
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={surgery.notes ?? ""}
                      onChange={(e) => {
                        const copy = [...surgeries];
                        copy[idx] = { ...copy[idx], notes: e.target.value };
                        setSurgeries(copy);
                      }}
                      className="col-span-3 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSurgeries(surgeries.filter((_, i) => i !== idx))
                      }
                      className="col-span-1 flex items-center justify-center text-rose-500 hover:text-rose-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Lifestyle Factors */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Smoking Status
                </label>
                <select
                  value={smokingStatus}
                  onChange={(e) =>
                    setSmokingStatus(e.target.value as SmokingStatus | "")
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600"
                >
                  <option value="">Select...</option>
                  <option value="never">Never</option>
                  <option value="former">Former</option>
                  <option value="current">Current</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Alcohol Consumption
                </label>
                <select
                  value={alcoholConsumption}
                  onChange={(e) =>
                    setAlcoholConsumption(
                      e.target.value as AlcoholConsumption | ""
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600"
                >
                  <option value="">Select...</option>
                  <option value="none">None</option>
                  <option value="occasional">Occasional</option>
                  <option value="moderate">Moderate</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Physical Activity
                </label>
                <select
                  value={physicalActivity}
                  onChange={(e) =>
                    setPhysicalActivity(e.target.value as PhysicalActivity | "")
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600"
                >
                  <option value="">Select...</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>

            {/* Family History */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Family Medical History
              </label>
              <div className="mb-2.5 flex gap-2">
                <input
                  type="text"
                  value={familyInput}
                  onChange={(e) => setFamilyInput(e.target.value)}
                  placeholder="e.g., Diabetes, Hypertension"
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    addTag(familyInput, familyHistory, setFamilyHistory, () =>
                      setFamilyInput("")
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {familyHistory.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() =>
                        setFamilyHistory(
                          familyHistory.filter((f) => f !== item)
                        )
                      }
                      className="ml-1 font-bold hover:text-rose-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => {
                  if (history) syncFormWithData(history);
                  setIsEditing(false);
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Medical History"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}