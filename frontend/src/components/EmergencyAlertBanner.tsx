import React from "react";
import {
  AlertTriangle,
  Ambulance,
  HeartPulse,
  PhoneCall,
  ShieldAlert,
  AlertOctagon,
  ArrowRight,
} from "lucide-react";
import type { EmergencyAssessmentResponse } from "../types/emergency";

interface Props {
  emergency: EmergencyAssessmentResponse;
  onDismiss?: () => void;
}

export const EmergencyAlertBanner: React.FC<Props> = ({ emergency, onDismiss }) => {
  if (!emergency.is_emergency && emergency.urgency_tier !== "HIGH_URGENCY") {
    return null;
  }

  const isCritical = emergency.urgency_tier === "CRITICAL_EMERGENCY";

  return (
    <div
      className={`rounded-2xl border-2 p-5 sm:p-6 shadow-xl transition-all ${
        isCritical
          ? "border-rose-500 bg-gradient-to-br from-rose-50 via-red-50/80 to-white ring-4 ring-rose-200"
          : "border-amber-400 bg-amber-50/70"
      }`}
    >
      {/* Top Warning Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rose-200 pb-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md ${
              isCritical ? "bg-rose-600 text-white animate-pulse" : "bg-amber-600 text-white"
            }`}
          >
            {isCritical ? (
              <AlertOctagon className="h-7 w-7" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wider text-white shadow-xs ${
                  isCritical ? "bg-rose-700" : "bg-amber-700"
                }`}
              >
                {isCritical ? "CRITICAL CLINICAL EMERGENCY" : "HIGH CLINICAL URGENCY"}
              </span>
              <span className="rounded-full border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                Risk Score: {emergency.risk_score} / 100
              </span>
              {emergency.primary_emergency_category && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                  {emergency.primary_emergency_category}
                </span>
              )}
            </div>
            <h3 className="mt-1.5 text-lg font-black text-rose-950 sm:text-xl">
              {isCritical
                ? "Immediate Emergency Medical Evaluation Required"
                : "Urgent Medical Attention Advised"}
            </h3>
            <p className="mt-1 text-xs text-rose-900/90 sm:text-sm font-medium">
              {emergency.triage_summary}
            </p>
          </div>
        </div>

        {/* Emergency Call Hotline Button */}
        <div className="flex flex-col sm:items-end gap-1.5">
          <a
            href="tel:112"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-700 active:scale-95"
          >
            <PhoneCall className="h-5 w-5 animate-bounce" />
            CALL EMERGENCY (112 / 911 / 108)
          </a>
          <span className="text-[11px] font-semibold text-rose-800 text-center sm:text-right">
            Do NOT drive yourself — Call an Ambulance
          </span>
        </div>
      </div>

      {/* Red Flags Identified */}
      {emergency.red_flags.length > 0 && (
        <div className="mt-5 space-y-3">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-900">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            Detected Life-Threatening Red Flags ({emergency.red_flags.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {emergency.red_flags.map((flag) => (
              <div
                key={flag.flag_id}
                className="rounded-xl border border-rose-200 bg-white/90 p-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-900">{flag.title}</span>
                  <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">
                    {flag.category}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-700 font-medium leading-relaxed">
                  {flag.clinical_rationale}
                </p>
                <div className="mt-2.5 rounded-lg bg-rose-50 border border-rose-100 p-2 text-[11px] font-semibold text-rose-900">
                  <span className="font-bold text-rose-950">Action: </span>
                  {flag.action_required}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vital Sign Warnings */}
      {emergency.vital_warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-300 bg-rose-100/60 p-3.5 text-xs text-rose-950">
          <div className="flex items-center gap-2 font-bold mb-1">
            <HeartPulse className="h-4 w-4 text-rose-700" />
            Abnormal Vital Sign Warnings:
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {emergency.vital_warnings.map((w, idx) => (
              <li key={idx} className="font-semibold">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Immediate Safety and First-Aid Actions */}
      {emergency.immediate_actions.length > 0 && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-white/95 p-4 shadow-xs">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 mb-2.5">
            <Ambulance className="h-4 w-4 text-rose-600" />
            Immediate Life-Safety & First-Aid Instructions
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {emergency.immediate_actions.map((action, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-800 font-medium"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-800">
                  {i + 1}
                </span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Destination */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-900/5 px-4 py-3 text-xs font-semibold text-rose-950">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-rose-600 shrink-0" />
          <span>
            <strong className="text-rose-900 font-bold">Recommended Destination: </strong>
            {emergency.recommended_destination}
          </span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
          >
            Acknowledge & Close
          </button>
        )}
      </div>
    </div>
  );
};
