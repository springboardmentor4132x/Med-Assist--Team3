import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchMySymptomAssessments,
  fetchSymptomsCatalog,
  submitSelectedSymptoms,
} from "../services/symptoms";
import type {
  IntegratedSymptomAssessmentResponse,
  SymptomCatalogItem,
  SymptomInputItem,
} from "../types/symptoms";

export function SymptomSelectionPage() {
  const { user } = useAuth();

  const [catalog, setCatalog] = useState<SymptomCatalogItem[]>([]);
  const [selected, setSelected] = useState<SymptomInputItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assessment, setAssessment] =
    useState<IntegratedSymptomAssessmentResponse | null>(null);

  const [historyList, setHistoryList] = useState<
    IntegratedSymptomAssessmentResponse[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const data = await fetchSymptomsCatalog();
        setCatalog(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load symptoms."
        );
      } finally {
        setLoading(false);
      }
    }

    async function loadHistory() {
      try {
        setLoadingHistory(true);
        const data = await fetchMySymptomAssessments();
        setHistoryList(data);
      } catch {
        // Ignore if user has no history yet or endpoint isn't reachable
      } finally {
        setLoadingHistory(false);
      }
    }

    loadCatalog();
    loadHistory();
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(catalog.map((item) => item.category)))],
    [catalog]
  );

  const filteredSymptoms = useMemo(() => {
    const term = search.trim().toLowerCase();

    return catalog.filter((symptom) => {
      const matchesCategory =
        category === "All" || symptom.category === category;

      const matchesSearch =
        !term ||
        symptom.name.toLowerCase().includes(term) ||
        symptom.id.toLowerCase().includes(term) ||
        symptom.aliases.some((alias) =>
          alias.toLowerCase().includes(term)
        );

      return matchesCategory && matchesSearch;
    });
  }, [catalog, search, category]);

  const isSelected = (id: string) =>
    selected.some((item) => item.symptom_id === id);

  function toggleSymptom(symptom: SymptomCatalogItem) {
    setSuccess("");
    setError("");

    if (isSelected(symptom.id)) {
      setSelected((previous) =>
        previous.filter((item) => item.symptom_id !== symptom.id)
      );
      return;
    }

    if (selected.length >= 30) {
      setError("You can select a maximum of 30 symptoms.");
      return;
    }

    setSelected((previous) => [
      ...previous,
      {
        symptom_id: symptom.id,
        severity: "moderate",
        duration_days: 1,
      },
    ]);
  }

  function updateSymptom(
    id: string,
    field: "severity" | "duration_days",
    value: string
  ) {
    setSelected((previous) =>
      previous.map((item) =>
        item.symptom_id === id
          ? {
              ...item,
              [field]:
                field === "duration_days" ? Number(value) : value,
            }
          : item
      )
    );
  }

  async function handleSubmit() {
    if (selected.length === 0) {
      setError("Please select at least one symptom.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await submitSelectedSymptoms(selected);

      setAssessment(response);
      setHistoryList((previous) => [response, ...previous]);
      setSuccess(
        `Assessment #${response.assessment_id} completed and integrated with your medical history.`
      );
      setSelected([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit symptoms."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">
              MedAssist AI
            </p>
            <h1 className="mt-1 text-3xl font-bold">
              Symptom Selection
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Select the symptoms you are currently experiencing.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {user?.full_name}
            </span>
            <Link
              to="/medical-history"
              className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100"
            >
              Medical History
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {assessment && (
          <section className="mb-8 rounded-2xl border border-teal-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                  Integrated Assessment #{assessment.assessment_id}
                </span>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Symptom Analysis &amp; Medical History Context
                </h2>
              </div>
              <Link
                to="/medical-history"
                className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
              >
                Update Medical History
              </Link>
            </div>

            {assessment.has_red_flags && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <strong>Urgent Red-Flag Symptoms Detected:</strong>{" "}
                {assessment.red_flag_symptoms.join(", ")}. Please seek prompt medical evaluation.
              </div>
            )}

            {assessment.warnings.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-semibold">Clinical Validation Notes:</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {assessment.warnings.map((w, idx) => (
                    <li key={idx}>{w.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {/* Current Symptom Correlation Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Current Symptom Correlation Summary
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Cluster Coherence:{" "}
                  <span className="font-semibold capitalize text-slate-800">
                    {assessment.cluster_coherence}
                  </span>{" "}
                  • Affected Systems:{" "}
                  <span className="font-semibold capitalize text-slate-800">
                    {assessment.primary_affected_systems.join(", ").replace(/_/g, " ") || "General"}
                  </span>
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {assessment.validated_symptoms.map((sym) => (
                    <span
                      key={sym.symptom_id}
                      className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                    >
                      {sym.name} ({sym.severity}, {sym.duration_days}d)
                    </span>
                  ))}
                </div>

                {assessment.top_correlated_pairs.length > 0 && (
                  <div className="mt-3 space-y-1.5 text-xs">
                    <p className="font-semibold text-slate-700">Top Correlated Pairs:</p>
                    {assessment.top_correlated_pairs.slice(0, 3).map((pair, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5"
                      >
                        <span>
                          {pair.symptom_a} + {pair.symptom_b}
                        </span>
                        <span className="font-medium text-teal-700">
                          {Math.round(pair.correlation_score * 100)}% ({pair.clinical_relevance})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {assessment.suggested_co_occurring_symptoms.length > 0 && (
                  <div className="mt-3 text-xs">
                    <p className="font-semibold text-slate-700">
                      Related Co-Occurring Symptoms to Watch For:
                    </p>
                    <p className="mt-1 text-slate-600">
                      {assessment.suggested_co_occurring_symptoms
                        .map((s) => s.name)
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {/* Integrated Baseline Medical History Context */}
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Relevant Medical History Context
                  </h3>
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                    {assessment.medical_history_context.previous_assessments_count} prior assessment(s)
                  </span>
                </div>

                <dl className="mt-3 space-y-2 text-xs text-slate-700">
                  <div>
                    <dt className="font-semibold text-slate-900">Blood Group:</dt>
                    <dd>
                      {assessment.medical_history_context.blood_group || "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">Chronic Conditions:</dt>
                    <dd>
                      {assessment.medical_history_context.chronic_conditions.length > 0
                        ? assessment.medical_history_context.chronic_conditions.join(", ")
                        : "None recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">Known Allergies:</dt>
                    <dd>
                      {assessment.medical_history_context.allergies.length > 0
                        ? assessment.medical_history_context.allergies.join(", ")
                        : "None recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">Current Medications:</dt>
                    <dd>
                      {assessment.medical_history_context.current_medications.length > 0
                        ? assessment.medical_history_context.current_medications
                            .map((m) =>
                              [m.name, m.dosage, m.frequency].filter(Boolean).join(" ")
                            )
                            .join(", ")
                        : "None recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">Family History:</dt>
                    <dd>
                      {assessment.medical_history_context.family_history.length > 0
                        ? assessment.medical_history_context.family_history.join(", ")
                        : "None recorded"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Disclaimer: This integrated symptom assessment provides preliminary insights for Module 3 disease prediction and does not constitute a medical diagnosis.
            </p>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">
                Available Symptoms
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search symptoms or browse by category.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search fever, headache, cough..."
              className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="mb-5 flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-3 py-2 text-sm ${
                    category === item
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="py-10 text-center text-slate-500">
                Loading symptoms...
              </p>
            ) : filteredSymptoms.length === 0 ? (
              <p className="py-10 text-center text-slate-500">
                No matching symptoms found.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredSymptoms.map((symptom) => {
                  const active = isSelected(symptom.id);

                  return (
                    <button
                      key={symptom.id}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      aria-pressed={active}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold">
                          {symptom.name}
                        </span>
                        <span className="text-blue-600">
                          {active ? "✓" : "+"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs capitalize text-slate-500">
                        {symptom.category.replace(/_/g, " ")}
                      </p>

                      {symptom.is_red_flag && (
                        <span className="mt-2 inline-block rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                          Red flag
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Selected Symptoms
                </h2>
                <p className="text-sm text-slate-500">
                  Manage your selections below.
                </p>
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                {selected.length}/30
              </span>
            </div>

            {selected.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
                No symptoms selected yet.
              </p>
            ) : (
              <div className="space-y-4">
                {selected.map((item) => {
                  const details = catalog.find(
                    (symptom) => symptom.id === item.symptom_id
                  );

                  return (
                    <div
                      key={item.symptom_id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-semibold">
                          {details?.name ?? item.symptom_id}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            details
                              ? toggleSymptom(details)
                              : setSelected((prev) =>
                                  prev.filter(
                                    (s) => s.symptom_id !== item.symptom_id
                                  )
                                )
                          }
                          className="text-sm text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>

                      <label className="mb-1 block text-xs text-slate-500">
                        Severity
                      </label>
                      <select
                        value={item.severity}
                        onChange={(event) =>
                          updateSymptom(
                            item.symptom_id,
                            "severity",
                            event.target.value
                          )
                        }
                        className="mb-3 w-full rounded-lg border border-slate-300 p-2"
                      >
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>

                      <label className="mb-1 block text-xs text-slate-500">
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={item.duration_days}
                        onChange={(event) =>
                          updateSymptom(
                            item.symptom_id,
                            "duration_days",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 p-2"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || loading || selected.length === 0}
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Symptoms"}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Your selection will be integrated with your logged-in medical history.
            </p>
          </section>
        </div>

        {/* Past Integrated Symptom Assessments History */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                My Symptom Analysis History ({historyList.length})
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Past symptom submissions integrated with your medical history.
              </p>
            </div>
            <span className="text-xs text-slate-400">Newest first</span>
          </div>

          {loadingHistory ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Loading past assessments...
            </p>
          ) : historyList.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
              No past symptom assessments found. Submit symptoms above to create your first record.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {historyList.map((item) => (
                <div
                  key={item.assessment_id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        Assessment #{item.assessment_id}
                      </span>
                      <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-teal-800">
                        Coherence: {item.cluster_coherence}
                      </span>
                      {item.has_red_flags && (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                          Red Flags: {item.red_flag_symptoms.join(", ")}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.validated_symptoms.map((sym) => (
                      <span
                        key={sym.symptom_id}
                        className="rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-xs font-medium text-blue-800"
                      >
                        {sym.name} ({sym.severity}, {sym.duration_days}d)
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-2 border-t border-slate-200 pt-2.5 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-slate-800">
                        Affected Systems:
                      </span>{" "}
                      <span className="capitalize">
                        {item.primary_affected_systems
                          .join(", ")
                          .replace(/_/g, " ") || "General"}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">
                        Recorded Conditions at Time of Check:
                      </span>{" "}
                      {item.medical_history_context.chronic_conditions.length > 0
                        ? item.medical_history_context.chronic_conditions.join(", ")
                        : "None"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}