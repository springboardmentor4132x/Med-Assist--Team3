
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchSymptomsCatalog,
  submitSelectedSymptoms,
} from "../services/symptoms";
import type {
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

    loadCatalog();
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

      setSuccess(
        `${response.message} Submission ID: ${response.submission_id}`
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
                          onClick={() => toggleSymptom(details!)}
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
              Your selection will be associated with your logged-in account.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
