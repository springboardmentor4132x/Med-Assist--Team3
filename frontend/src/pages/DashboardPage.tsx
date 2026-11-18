import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  Clock,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  User as UserIcon,
} from "lucide-react";
import { AppNavbar } from "../components/AppNavbar";
import { useAuth } from "../context/AuthContext";
import { getMyAuditLogsRequest } from "../services/api";
import type { AuditLogItem } from "../types/auth";

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Signed In",
  LOGIN_FAILED: "Failed Sign-In Attempt",
  LOGIN_LOCKED: "Account Temporarily Locked",
  REGISTER_SUCCESS: "Account Created",
  LOGOUT: "Signed Out",
  TOKEN_REFRESH: "Session Refreshed",
  PROFILE_UPDATED: "Profile Updated",
};

function formatEventLabel(eventType: string): string {
  if (EVENT_LABELS[eventType]) return EVENT_LABELS[eventType];
  return eventType
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const loadInitialData = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const logs = await getMyAuditLogsRequest();
      setAuditLogs(logs);
    } catch {
      // Handled globally if 401
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  if (!user) return null;

  const isPatient = user.role === "patient";

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNavbar />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 p-6 text-white shadow-sm sm:p-8">
          <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                {user.role.toUpperCase()} PORTAL
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome back, {user.full_name}
              </h1>
              <p className="mt-2 max-w-2xl text-xs text-teal-100/90 sm:text-sm">
                {isPatient
                  ? "Evaluate current symptoms with AI correlation screening, track your medical history, and manage your health profile."
                  : "Access clinical symptom analysis tools, look up authorized patient medical records, and manage your professional profile."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/symptoms")}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-teal-900 shadow-sm transition hover:bg-teal-50 sm:self-center"
            >
              <HeartPulse className="h-4 w-4 text-teal-700" />
              New Symptom Check
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* Primary Healthcare Clinical Actions */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Action 1: Symptom Analysis */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500 hover:shadow-md">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <HeartPulse className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">Symptom Checker</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Select symptoms, validate clinical terms, screen for emergency red flags, and run AI co-occurrence correlation analysis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/symptoms")}
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-800"
            >
              Start Symptom Check
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Action 2: Medical History / Patient Records (Role-Adapted) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500 hover:shadow-md">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">
                {isPatient ? "Medical History" : "Patient Records Lookup"}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {isPatient
                  ? "View and update your chronic conditions, active medications, allergies, surgeries, and lifestyle indicators."
                  : "Look up authorized patient medical histories including baseline conditions, active medications, and allergy alerts."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(isPatient ? "/medical-history" : "/patient-history")}
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-800"
            >
              {isPatient ? "Manage Medical History" : "Lookup Patient Records"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Action 3: Profile Management */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500 hover:shadow-md">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <UserIcon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">Profile &amp; Settings</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Review your registered account details, update your display name, and view your clinical portal role.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-800"
            >
              Manage Profile
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* Clinical Safety & Advisory Notice */}
        <section className="rounded-2xl border border-teal-200/70 bg-teal-50/60 p-5 text-xs text-slate-700">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Clinical Triage &amp; Assessment Guidelines</h3>
              <p className="mt-1 leading-relaxed text-slate-600">
                MedAssist AI provides preliminary symptom screening and risk stratification. If you or someone you are assisting is experiencing severe emergency symptoms (such as acute chest pressure, sudden numbness or paralysis, severe shortness of breath, or uncontrolled bleeding), please contact emergency medical services (911 / 112) immediately.
              </p>
            </div>
          </div>
        </section>

        {/* Recent Account Activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Account Activity</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Recent sign-ins and security events for your account.
              </p>
            </div>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>

          {loadingLogs ? (
            <div className="mt-5 py-6 text-center text-xs text-slate-400">
              Loading recent activity…
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="mt-5 rounded-xl bg-slate-50 py-6 text-center text-xs text-slate-500">
              No recent account activity recorded yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Activity</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold">Details</th>
                    <th className="py-2 font-semibold">Date &amp; Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.slice(0, 5).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-4 font-medium text-slate-800">
                        {formatEventLabel(log.event_type)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            log.success
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {log.success ? "Verified" : "Blocked"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{log.detail}</td>
                      <td className="whitespace-nowrap py-2.5 text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
