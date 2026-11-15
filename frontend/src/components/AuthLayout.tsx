import type { ReactNode } from "react";
import { Activity, Lock, ShieldCheck, Stethoscope } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const PLATFORM_HIGHLIGHTS = [
  {
    icon: Activity,
    title: "Symptom Analysis & Disease Prediction",
    description:
      "AI-driven symptom correlation, multi-disease probability scoring, and severity assessment.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access Control (RBAC)",
    description:
      "Dedicated workspaces for Patients, Doctors, Clinics, and System Administrators.",
  },
  {
    icon: Lock,
    title: "JWT + Server-Side Token Revocation",
    description:
      "Short-lived signed access tokens, refresh rotation, lockout defense, and audit logging.",
  },
];

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-12">
      {/* Left clinical branding panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-cyan-900 p-10 text-white lg:col-span-5 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #2dd4bf 0%, transparent 45%), radial-gradient(circle at 80% 80%, #38bdf8 0%, transparent 45%)",
          }}
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-teal-400/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400 text-teal-950 shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">MedAssist AI</p>
              <p className="text-xs text-teal-200">Medical Symptom &amp; Risk Platform</p>
            </div>
          </div>

          <h1 className="mt-10 text-3xl font-bold leading-tight tracking-tight text-white">
            Early health insights powered by secure medical AI.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-teal-100/90">
            Centralized platform for symptom analysis, preliminary disease prediction, risk
            scoring, and clinical health reports.
          </p>

          <div className="mt-10 space-y-5">
            {PLATFORM_HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-400/15 text-teal-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-teal-100/80">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 mt-8 border-t border-white/10 pt-5 text-xs text-teal-100/75">
          <div className="flex flex-wrap gap-2">
            {["Patients", "Doctors", "Clinics", "Admins"].map((role) => (
              <span
                key={role}
                className="rounded-full border border-teal-300/25 bg-teal-400/10 px-2.5 py-0.5 text-[11px] font-medium text-teal-100"
              >
                {role}
              </span>
            ))}
          </div>
          <p className="mt-3 leading-relaxed">
            Clinical Notice: MedAssist AI provides preliminary symptom decision-support and is not
            a substitute for professional medical diagnosis.
          </p>
        </div>
      </aside>

      {/* Right form surface */}
      <main className="flex min-h-screen flex-col justify-center px-4 py-10 sm:px-8 lg:col-span-7 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile brand header */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-bold text-slate-900">MedAssist AI</p>
              <p className="text-xs text-slate-500">Medical Symptom Analysis &amp; Prediction</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">
            <header className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
              <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
            </header>

            {children}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Protected by JWT Bearer Authentication &amp; Role-Based Access Control
          </p>
        </div>
      </main>
    </div>
  );
}

