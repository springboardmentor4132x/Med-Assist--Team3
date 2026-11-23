import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  HeartPulse,
  History,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AppNavbar } from "../components/AppNavbar";
import { DiseasePredictionCard } from "../components/DiseasePredictionCard";
import {
  fetchMySymptomAssessments,
  fetchSymptomsCatalog,
  submitSelectedSymptoms,
} from "../services/symptoms";
import { fetchComprehensivePrediction } from "../services/predictions";
import type { ComprehensivePredictionResponse } from "../types/predictions";
import type {
  ClusterCoherence,
  IntegratedSymptomAssessmentResponse,
  SymptomCatalogItem,
  SymptomInputItem,
  SymptomSeverity,
} from "../types/symptoms";

const COHERENCE_STYLES: Record<
  ClusterCoherence,
  { badge: string; label: string }
> = {
  high: {
    badge: "border-teal-200 bg-teal-50 text-teal-800",
    label: "High Clinical Coherence",
  },
  moderate: {
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    label: "Moderate Coherence",
  },
  low: {
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    label: "Broad / Non-Specific",
  },
};

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function SymptomSelectionPage() {
  const resultsRef = useRef<HTMLElement | null>(null);

  const [catalog, setCatalog] = useState<SymptomCatalogItem[]>([]);
  const [selected, setSelected] = useState<SymptomInputItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [redFlagsOnly, setRedFlagsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [assessment, setAssessment] =
    useState<IntegratedSymptomAssessmentResponse | null>(null);
  const [diseasePrediction, setDiseasePrediction] =
    useState<ComprehensivePredictionResponse | null>(null);

  const [historyList, setHistoryList] = useState<
    IntegratedSymptomAssessmentResponse[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        setLoading(true);
        const data = await fetchSymptomsCatalog();
        if (active) setCatalog(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load symptoms catalog."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    async function loadHistory() {
      try {
        setLoadingHistory(true);
        const data = await fetchMySymptomAssessments();
        if (active) setHistoryList(data);
      } catch {
        // Patient may have no history records yet
      } finally {
        if (active) setLoadingHistory(false);
      }
    }

    void loadCatalog();
    void loadHistory();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [catalog]);

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.symptom_id)),
    [selected]
  );

  const catalogMap = useMemo(() => {
    const map = new Map<string, SymptomCatalogItem>();
    catalog.forEach((item) => map.set(item.id, item));
    return map;
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((item) => {
      if (category !== "All" && item.category !== category) return false;
      if (redFlagsOnly && !item.is_red_flag) return false;
      if (!q) return true;

      const nameMatch = item.name.toLowerCase().includes(q);
      const catMatch = item.category.toLowerCase().includes(q);
      const aliasMatch = item.aliases.some((a) => a.toLowerCase().includes(q));
      return nameMatch || catMatch || aliasMatch;
    });
  }, [catalog, search, category, redFlagsOnly]);

  function toggleSymptom(item: SymptomCatalogItem) {
    setSelected((prev) => {
      const exists = prev.some((s) => s.symptom_id === item.id);
      if (exists) {
        return prev.filter((s) => s.symptom_id !== item.id);
      }
      return [
        ...prev,
        {
          symptom_id: item.id,
          severity: "moderate",
          duration_days: 2,
        },
      ];
    });
  }

  function addSymptomById(id: string) {
    if (selectedIds.has(id)) return;
    const catItem = catalogMap.get(id);
    setSelected((prev) => [
      ...prev,
      {
        symptom_id: id,
        severity: catItem?.is_red_flag ? "severe" : "moderate",
        duration_days: 2,
      },
    ]);
  }

  function removeSymptomById(id: string) {
    setSelected((prev) => prev.filter((s) => s.symptom_id !== id));
  }

  function updateSeverity(id: string, severity: SymptomSeverity) {
    setSelected((prev) =>
      prev.map((s) => (s.symptom_id === id ? { ...s, severity } : s))
    );
  }

  function updateDuration(id: string, raw: string) {
    const parsed = parseInt(raw, 10);
    const duration_days = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(365, parsed));
    setSelected((prev) =>
      prev.map((s) => (s.symptom_id === id ? { ...s, duration_days } : s))
    );
  }

  async function handleAnalyzeAndSubmit() {
    if (selected.length === 0) {
      setError("Please select at least one symptom to analyze.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const symptomIds = selected.map((s) => s.symptom_id);
      const [assessmentRes, predictionRes] = await Promise.all([
        submitSelectedSymptoms(selected),
        fetchComprehensivePrediction(symptomIds).catch(() => null),
      ]);

      setAssessment(assessmentRes);
      setDiseasePrediction(predictionRes);
      setHistoryList((prev) => [assessmentRes, ...prev]);

      window.requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to complete symptom analysis."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppNavbar />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
              <HeartPulse className="h-3.5 w-3.5" />
              Clinical Symptom Screening &amp; Medical History Integration
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Symptom Checker &amp; Clinical Correlation
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Select symptoms, specify clinical severity and duration, and run real-time correlation analysis integrated with your baseline medical history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/medical-history"
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-100"
            >
              <FileText className="h-4 w-4" />
              Manage Medical History
            </Link>
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-700">{catalog.length} catalog symptoms</p>
              <p>{selected.length} currently selected</p>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold text-rose-900">Clinical Validation Notice</p>
              <p className="mt-0.5 text-rose-800">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-rose-500 hover:text-rose-700"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main 2-Column Clinical Layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Catalog & Search Section */}
          <section className="space-y-4 lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              {/* Search Bar + Red Flag Filter */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search symptoms or aliases (e.g., fever, chest pain, cough)…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-3 focus:ring-teal-600/15"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setRedFlagsOnly((prev) => !prev)}
                  aria-pressed={redFlagsOnly}
                  className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
                    redFlagsOnly
                      ? "border-rose-300 bg-rose-50 text-rose-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <AlertTriangle
                    className={`h-3.5 w-3.5 ${
                      redFlagsOnly ? "text-rose-600" : "text-slate-400"
                    }`}
                  />
                  Red Flags Only
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3.5">
                {categories.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        active
                          ? "bg-teal-700 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Catalog Items Grid */}
              <div className="mt-4">
                {loading ? (
                  <div className="flex h-56 flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                    <p className="text-xs">Loading symptom catalog…</p>
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      No matching symptoms found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try clearing filters or searching another clinical term.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
                    {filteredCatalog.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleSymptom(item)}
                          className={`group flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3.5 transition ${
                            isSelected
                              ? "border-teal-300 bg-teal-50/70 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {item.name}
                              </span>
                              {item.is_red_flag && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                  <AlertTriangle className="h-3 w-3" />
                                  Red Flag
                                </span>
                              )}
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {item.category}
                              </span>
                            </div>

                            {item.aliases.length > 0 && (
                              <p className="mt-1 text-xs text-slate-500">
                                Also known as: {item.aliases.slice(0, 3).join(", ")}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            aria-label={isSelected ? "Deselect" : "Select"}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                              isSelected
                                ? "border-teal-600 bg-teal-700 text-white"
                                : "border-slate-300 bg-white text-slate-500 group-hover:border-teal-500 group-hover:text-teal-700"
                            }`}
                          >
                            {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Selected Symptoms & Submission Tray */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Selected Symptoms ({selected.length})
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Configure severity and duration before running analysis.
                </p>
              </div>

              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All
                </button>
              )}
            </div>

            {selected.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <HeartPulse className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  No symptoms added yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Click symptoms from the catalog on the left to include them in this assessment.
                </p>
              </div>
            ) : (
              <div className="mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {selected.map((item) => {
                  const details = catalogMap.get(item.symptom_id);
                  return (
                    <div
                      key={item.symptom_id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                    >
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900">
                            {details?.name ?? formatLabel(item.symptom_id)}
                          </span>
                          {details?.is_red_flag && (
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSymptomById(item.symptom_id)}
                          aria-label={`Remove ${details?.name ?? item.symptom_id}`}
                          className="rounded-md p-1 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                            Severity
                          </label>
                          <select
                            value={item.severity}
                            onChange={(event) =>
                              updateSeverity(
                                item.symptom_id,
                                event.target.value as SymptomSeverity
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                          >
                            <option value="mild">Mild</option>
                            <option value="moderate">Moderate</option>
                            <option value="severe">Severe</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                            Duration (days)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={item.duration_days}
                            onChange={(event) =>
                              updateDuration(item.symptom_id, event.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyzeAndSubmit}
              disabled={submitting || loading || selected.length === 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing &amp; Integrating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze &amp; Submit Assessment
                </>
              )}
            </button>

            <p className="mt-2.5 text-center text-[11px] text-slate-400">
              Validates clinical terms, runs correlation analysis, and integrates with your medical history.
            </p>
          </aside>
        </div>

        {/* Module 3: Disease Prediction & Clinical Confidence Assessment */}
        {diseasePrediction && (
          <DiseasePredictionCard prediction={diseasePrediction} />
        )}

        {/* Live Clinical Analysis & Medical History Integration Results */}
        {assessment && (
          <section
            ref={resultsRef}
            className="space-y-5 rounded-2xl border border-teal-200 bg-white p-6 shadow-sm sm:p-7"
          >
            {/* Header & Confirmation */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Integrated Symptom Assessment #{assessment.assessment_id}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Created: {new Date(assessment.created_at).toLocaleString()} •{" "}
                    {assessment.validated_symptoms.length} validated clinical symptom
                    {assessment.validated_symptoms.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  COHERENCE_STYLES[assessment.cluster_coherence].badge
                }`}
              >
                {COHERENCE_STYLES[assessment.cluster_coherence].label}
              </span>
            </div>

            {/* Emergency Red-Flag Banner */}
            {assessment.has_red_flags && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <p className="font-bold text-rose-900">
                    Urgent Red-Flag Symptom Detected
                  </p>
                  <p className="mt-1 leading-relaxed text-rose-800">
                    The following reported symptom(s) can indicate an urgent medical condition:{" "}
                    <strong>
                      {assessment.red_flag_symptoms.map(formatLabel).join(", ")}
                    </strong>
                    . Please seek prompt medical evaluation or call emergency services if symptoms are severe or worsening.
                  </p>
                </div>
              </div>
            )}

            {/* Medical History Integration Context Card */}
            <div className="rounded-xl border border-teal-200/80 bg-teal-50/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                  Integrated Patient Medical History Context
                </span>
                <Link
                  to="/medical-history"
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  Update History &rarr;
                </Link>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div className="rounded-lg bg-white p-3 border border-teal-100">
                  <p className="font-semibold text-slate-500">Blood Group</p>
                  <p className="mt-1 font-bold text-slate-800">
                    {assessment.medical_history_context.blood_group || "Not recorded"}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-3 border border-teal-100">
                  <p className="font-semibold text-slate-500">Chronic Conditions</p>
                  <p className="mt-1 text-slate-800">
                    {assessment.medical_history_context.chronic_conditions.length > 0
                      ? assessment.medical_history_context.chronic_conditions.join(", ")
                      : "None recorded"}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-3 border border-teal-100">
                  <p className="font-semibold text-slate-500">Active Medications</p>
                  <p className="mt-1 text-slate-800">
                    {assessment.medical_history_context.current_medications.length > 0
                      ? assessment.medical_history_context.current_medications
                          .map((m) => m.name)
                          .join(", ")
                      : "None recorded"}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-3 border border-teal-100">
                  <p className="font-semibold text-slate-500">Known Allergies</p>
                  <p className="mt-1 text-slate-800">
                    {assessment.medical_history_context.allergies.length > 0
                      ? assessment.medical_history_context.allergies.join(", ")
                      : "None recorded"}
                  </p>
                </div>
              </div>
            </div>

            {/* Affected Systems & Disease Categories */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Primary Affected Body Systems
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {assessment.primary_affected_systems.length > 0 ? (
                    assessment.primary_affected_systems.map((sys) => (
                      <span
                        key={sys}
                        className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold capitalize text-teal-800"
                      >
                        {sys.replace(/_/g, " ")}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">General</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Potential Clinical Categories
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {assessment.potential_disease_categories.length > 0 ? (
                    assessment.potential_disease_categories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold text-cyan-800"
                      >
                        {cat}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">
                      Add more symptoms to narrow clinical categories
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Co-Occurrence Correlations */}
            {assessment.top_correlated_pairs.length > 0 && (
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Symptom Co-Occurrence Correlations
                  </h3>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {assessment.top_correlated_pairs.map((pair) => {
                    const pct = Math.round(pair.correlation_score * 100);
                    return (
                      <div
                        key={`${pair.symptom_a}-${pair.symptom_b}`}
                        className="rounded-xl border border-slate-200 p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800">
                          <span>
                            {formatLabel(pair.symptom_a)} + {formatLabel(pair.symptom_b)}
                          </span>
                          <span className="text-teal-700">{pct}% match</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-600"
                            style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {pair.clinical_relevance}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Suggested Co-Occurring Symptoms */}
            {assessment.suggested_co_occurring_symptoms.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Related Symptoms to Consider
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Patients reporting your symptoms frequently also experience the following. Click to add any that apply and re-analyze.
                </p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {assessment.suggested_co_occurring_symptoms.map((suggestion) => {
                    const alreadyAdded = selectedIds.has(suggestion.symptom_id);
                    return (
                      <div
                        key={suggestion.symptom_id}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {suggestion.name}
                            </span>
                            <span className="text-[11px] font-semibold text-teal-700">
                              {Math.round(suggestion.correlation_score * 100)}%
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {suggestion.reason}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => addSymptomById(suggestion.symptom_id)}
                          className="mt-3 inline-flex items-center justify-center gap-1 rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-teal-800 transition hover:bg-teal-50 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {alreadyAdded ? (
                            <>
                              <Check className="h-3 w-3" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Add Symptom
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Past Integrated Symptom Assessments History */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-teal-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  My Symptom Assessment History ({historyList.length})
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Past symptom submissions integrated with your recorded medical history.
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400">Newest first</span>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              <span className="ml-2 text-xs">Loading past assessments…</span>
            </div>
          ) : historyList.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">
              No past symptom assessments found. Submit symptoms above to create your first integrated record.
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
      </main>
    </div>
  );
}
