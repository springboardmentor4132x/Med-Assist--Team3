import React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  HelpCircle,
  Info,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import type { ComprehensivePredictionResponse, UrgencyLevel } from "../types/predictions";

interface Props {
  prediction: ComprehensivePredictionResponse;
}

const URGENCY_THEMES: Record<
  UrgencyLevel,
  { badge: string; border: string; bg: string; text: string; label: string }
> = {
  emergency: {
    badge: "bg-rose-600 text-white border-rose-700",
    border: "border-rose-300",
    bg: "bg-rose-50/70",
    text: "text-rose-800",
    label: "EMERGENCY TRIAGE",
  },
  high: {
    badge: "bg-amber-600 text-white border-amber-700",
    border: "border-amber-300",
    bg: "bg-amber-50/70",
    text: "text-amber-800",
    label: "HIGH URGENCY",
  },
  moderate: {
    badge: "bg-sky-600 text-white border-sky-700",
    border: "border-sky-300",
    bg: "bg-sky-50/70",
    text: "text-sky-800",
    label: "MODERATE CLINICAL PRIORITY",
  },
  low: {
    badge: "bg-emerald-600 text-white border-emerald-700",
    border: "border-emerald-300",
    bg: "bg-emerald-50/70",
    text: "text-emerald-800",
    label: "LOW / ROUTINE CLINICAL PRIORITY",
  },
};

const CONFIDENCE_THEMES = {
  High: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    bar: "bg-emerald-500",
    icon: CheckCircle2,
  },
  Moderate: {
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    bar: "bg-amber-500",
    icon: Info,
  },
  Low: {
    badge: "bg-rose-100 text-rose-800 border-rose-300",
    bar: "bg-rose-500",
    icon: HelpCircle,
  },
};

export const DiseasePredictionCard: React.FC<Props> = ({ prediction }) => {
  const { classification, probabilities, differential_diagnoses, confidence, triage_urgency } =
    prediction;

  const urgencyTheme = URGENCY_THEMES[triage_urgency as UrgencyLevel] || URGENCY_THEMES.moderate;
  const confTheme = CONFIDENCE_THEMES[confidence.confidence_level] || CONFIDENCE_THEMES.Moderate;
  const ConfIcon = confTheme.icon;

  return (
    <div className="space-y-5 rounded-2xl border border-teal-300 bg-white p-6 shadow-md sm:p-7">
      {/* Header Banner: Module 3 AI Disease Prediction */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Clinical Diagnostic Assessment
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 border border-teal-200">
                <Sparkles className="h-3 w-3" /> ML Multi-Class Prediction
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {classification.display_name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-xs ${urgencyTheme.badge}`}
          >
            {urgencyTheme.label}
          </span>
          <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">
            ICD-10: {classification.icd10}
          </span>
        </div>
      </div>

      {/* Component 4: Prediction Confidence Scoring Callout */}
      <div className={`rounded-xl border p-4.5 ${confTheme.badge} border-opacity-60 bg-opacity-30`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <ConfIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold">
                  Prediction Confidence: {confidence.confidence_level} ({confidence.confidence_percent}%)
                </h4>
                {confidence.ambiguity_flag && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                    <AlertTriangle className="h-3 w-3" /> Diagnostic Overlap
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed opacity-90">
                {confidence.clinical_recommendation}
              </p>
            </div>
          </div>

          {/* Confidence Meter Bar */}
          <div className="w-full sm:w-44 shrink-0">
            <div className="flex justify-between text-[11px] font-semibold mb-1">
              <span>Model Certainty</span>
              <span>{confidence.confidence_percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${confTheme.bar}`}
                style={{ width: `${confidence.confidence_percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Confidence Factor Badges */}
        <div className="mt-3.5 flex flex-wrap gap-2 border-t border-slate-200/50 pt-3 text-[11px]">
          <span className="rounded-md bg-white/80 px-2.5 py-1 font-semibold text-slate-700 border border-slate-200/60">
            Margin of Separation: +{Math.round(confidence.margin_of_separation * 100)}%
          </span>
          <span className="rounded-md bg-white/80 px-2.5 py-1 font-semibold text-slate-700 border border-slate-200/60">
            Symptom Coverage: {Math.round(confidence.symptom_coverage * 100)}%
          </span>
          <span className="rounded-md bg-white/80 px-2.5 py-1 font-semibold text-slate-700 border border-slate-200/60">
            Hallmark Pathognomonic Match: {confidence.hallmark_symptoms_present} key symptom(s)
          </span>
        </div>
      </div>

      {/* Overview Description */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-900 mb-1">Pathophysiological Summary:</p>
        <p>{classification.description}</p>
      </div>

      {/* Calibrated Probability Distribution */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Calibrated Probability Score Distribution
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Posteriors generated across candidate conditions
          </span>
        </div>

        <div className="space-y-2">
          {probabilities.map((item, index) => (
            <div
              key={item.disease}
              className={`rounded-xl border p-3 transition ${
                index === 0
                  ? "border-teal-300 bg-teal-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      index === 0
                        ? "bg-teal-700 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-bold text-slate-900">{item.display_name}</span>
                  <span className="text-[11px] text-slate-400">({item.category})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-800">
                    {item.probability_percent}%
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    index === 0 ? "bg-teal-600" : "bg-slate-400"
                  }`}
                  style={{ width: `${Math.max(4, item.probability_percent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Differential Diagnosis & Confirmatory Workup */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Differential Diagnosis &amp; Recommended Workup
            </h3>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {differential_diagnoses.map((diff) => (
            <div
              key={diff.disease}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    #{diff.rank} {diff.display_name}
                  </span>
                  <span className="text-[11px] font-bold text-teal-700">
                    {diff.probability_percent}%
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                  {diff.clinical_rationale}
                </p>

                {diff.missing_hallmark_symptoms.length > 0 && (
                  <div className="mt-2 text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-600">Unreported Hallmarks: </span>
                    {diff.missing_hallmark_symptoms.join(", ")}
                  </div>
                )}
              </div>

              <div className="mt-3 border-t border-slate-200/80 pt-2.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Recommended Diagnostic Workup:
                </span>
                <ul className="mt-1 space-y-0.5 text-[11px] text-teal-900">
                  {diff.recommended_diagnostic_tests.map((test) => (
                    <li key={test} className="flex items-center gap-1.5">
                      <FileCheck className="h-3 w-3 shrink-0 text-teal-600" />
                      <span>{test}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
