import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  HeartPulse,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AppNavbar } from "../components/AppNavbar";
import { useAuth } from "../context/AuthContext";
import {
  analyzeSymptoms,
  fetchSymptomsCatalog,
  submitSelectedSymptoms,
  type SymptomSubmissionResponse,
} from "../services/symptoms";
import type {
  ClusterCoherence,
  SymptomAnalysisResponse,
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
  const { user } = useAuth();
  const resultsRef = useRef<HTMLElement | null>(null);

  const [catalog, setCatalog] = useState<SymptomCatalogItem[]>([]);
  const [selected, setSelected] = useState<SymptomInputItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [redFlagsOnly, setRedFlagsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState<SymptomSubmissionResponse | null>(null);
  const [analysis, setAnalysis] = useState<SymptomAnalysisResponse | null>(null);

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

    void loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  const catalogById = useMemo(() => {
    const map = new Map<string, SymptomCatalogItem>();
    for (const item of catalog) {
      map.set(item.id, item);
    }
    return map;
  }, [catalog]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(catalog.map((item) => item.category)))],
    [catalog]
  );

  const filteredSymptoms = useMemo(() => {
    const term = search.trim().toLowerCase();

    return catalog.filter((symptom) => {
      if (redFlagsOnly && !symptom.is_red_flag) return false;
      const matchesCategory =
        category === "All" || symptom.category === category;
      const matchesSearch =
        !term ||
        symptom.name.toLowerCase().includes(term) ||
        symptom.id.toLowerCase().includes(term) ||
        symptom.description.toLowerCase().includes(term) ||
        symptom.aliases.some((alias) => alias.toLowerCase().includes(term));

      return matchesCategory && matchesSearch;
    });
  }, [catalog, search, category, redFlagsOnly]);

  const selectedIds = useMemo(
    () => new Set(selected.map((item) => item.symptom_id)),
    [selected]
  );

  function addSymptomById(symptomId: string) {
    setError("");
    if (selectedIds.has(symptomId)) return;
    if (selected.length >= 30) {
      setError("You can select a maximum of 30 symptoms per assessment.");
      return;
    }
    setSelected((prev) => [
      ...prev,
      { symptom_id: symptomId, severity: "moderate", duration_days: 1 },
    ]);
  }

  function removeSymptomById(symptomId: string) {
    setError("");
    setSelected((prev) => prev.filter((item) => item.symptom_id !== symptomId));
  }

  function toggleSymptom(symptom: SymptomCatalogItem) {
    if (selectedIds.has(symptom.id)) {
      removeSymptomById(symptom.id);
    } else {
      addSymptomById(symptom.id);
    }
  }

  function updateSeverity(id: string, severity: SymptomSeverity) {
    setSelected((prev) =>
      prev.map((item) =>
        item.symptom_id === id ? { ...item, severity } : item
      )
    );
  }

  function updateDuration(id: string, rawValue: string) {
    const parsed = Number.parseInt(rawValue, 10);
    const clamped = Number.isNaN(parsed) ? 1 : Math.min(365, Math.max(1, parsed));
    setSelected((prev) =>
      prev.map((item) =>
        item.symptom_id === id ? { ...item, duration_days: clamped } : item
      )
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

      const [submissionRes, analysisRes] = await Promise.all([
        submitSelectedSymptoms(selected),
        analyzeSymptoms(selected, user?.id),
      ]);

      setSubmission(submissionRes);
      setAnalysis(analysisRes);

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
              AI Symptom Screening &amp; Correlation
            </div>
            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Symptom Checker
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Select your current symptoms, specify severity and duration, and run clinical co-occurrence analysis.
            </p>
          </div>
          {catalog.length > 0 && (
            <p className="text-xs font-medium text-slate-500">
              Showing <span className="font-semibold text-slate-800">{filteredSymptoms.length}</span> of{" "}
              <span className="font-semibold text-slate-800">{catalog.length}</span> clinical symptoms
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Main 2-Column Workspace */}
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
          {/* Left: Searchable Symptom Catalog */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Red Flags Only
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    category === item
                      ? "bg-teal-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {item.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {/* Scrollable Symptom Cards */}
            <div className="mt-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-14 text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
                  <p className="mt-2.5 text-sm">Loading clinical symptom catalog…</p>
                </div>
              ) : filteredSymptoms.length === 0 ? (
                <div className="rounded-xl bg-slate-50 py-12 text-center">
                  <p className="text-sm font-medium text-slate-700">No matching symptoms found.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try clearing your search term or selecting &ldquo;All&rdquo; categories.
                  </p>
                </div>
              ) : (
                <div className="grid max-h-[580px] gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {filteredSymptoms.map((symptom) => {
                    const active = selectedIds.has(symptom.id);
                    return (
                      <button
                        key={symptom.id}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        aria-pressed={active}
                        className={`group rounded-xl border p-3.5 text-left transition ${
                          active
                            ? "border-teal-600 bg-teal-50/70 ring-1 ring-teal-600/20"
                            : "border-slate-200 bg-white hover:border-teal-400 hover:bg-slate-50/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {symptom.name}
                          </span>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs transition ${
                              active
                                ? "bg-teal-700 text-white"
                                : "bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700"
                            }`}
                          >
                            {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                            {symptom.category.replace(/_/g, " ")}
                          </span>
                          {symptom.is_red_flag && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                              <AlertTriangle className="h-3 w-3" />
                              Red Flag
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Right: Sticky Selected Symptoms Panel */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-20">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Selected Symptoms</h2>
                <p className="text-xs text-slate-500">Adjust severity &amp; duration before analysis.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                  {selected.length} / 30
                </span>
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected([]);
                      setError("");
                    }}
                    title="Clear all selected symptoms"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {selected.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
                <HeartPulse className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-600">No symptoms selected</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Click any symptom from the catalog on the left to add it to your assessment.
                </p>
              </div>
            ) : (
              <div className="mt-4 max-h-[380px] space-y-3 overflow-y-auto pr-1">
                {selected.map((item) => {
                  const details = catalogById.get(item.symptom_id);
                  return (
                    <div
                      key={item.symptom_id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
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
                  Analyzing Symptoms…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze &amp; Submit Symptoms
                </>
              )}
            </button>

            <p className="mt-2.5 text-center text-[11px] text-slate-400">
              Validates clinical terms, screens red flags &amp; saves to your account.
            </p>
          </aside>
        </div>

        {/* Live Clinical Analysis Results Panel */}
        {analysis && submission && (
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
                    Symptom Analysis &amp; Correlation Report
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Saved as Submission #{submission.submission_id} •{" "}
                    {analysis.validated_symptoms.length} validated clinical symptom
                    {analysis.validated_symptoms.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  COHERENCE_STYLES[analysis.cluster_coherence].badge
                }`}
              >
                {COHERENCE_STYLES[analysis.cluster_coherence].label}
              </span>
            </div>

            {/* Emergency Red-Flag Banner */}
            {analysis.has_red_flags && (
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
                      {analysis.red_flag_symptoms.map(formatLabel).join(", ")}
                    </strong>
                    . Please seek prompt medical evaluation or call emergency services if symptoms are severe or worsening.
                  </p>
                </div>
              </div>
            )}

            {/* Validation Warnings (Contradictions / Clinical Notices) */}
            {submission.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-bold">Clinical Validation Notices</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  {submission.warnings.map((w, idx) => (
                    <li key={`${w.code}-${idx}`}>{w.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Affected Systems & Disease Categories */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Primary Affected Body Systems
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {analysis.primary_affected_systems.length > 0 ? (
                    analysis.primary_affected_systems.map((sys) => (
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
                  {analysis.potential_disease_categories.length > 0 ? (
                    analysis.potential_disease_categories.map((cat) => (
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
            {analysis.top_correlated_pairs.length > 0 && (
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Symptom Co-Occurrence Correlations
                  </h3>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {analysis.top_correlated_pairs.map((pair) => {
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
            {analysis.suggested_co_occurring_symptoms.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Related Symptoms to Consider
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Patients reporting your symptoms frequently also experience the following. Click to add any that apply and re-analyze.
                </p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {analysis.suggested_co_occurring_symptoms.map((suggestion) => {
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
      </main>
    </div>
  );
}
