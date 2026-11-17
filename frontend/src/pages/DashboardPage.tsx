import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  LogOut,
  Stethoscope,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  callProtectedEndpoint,
  getMyAuditLogsRequest,
} from "../services/api";
import type { AuditLogItem, ProtectedResourceResponse } from "../types/auth";

const PROTECTED_ROUTES_TO_TEST = [
  {
    label: "General Dashboard",
    endpoint: "/api/v1/protected/dashboard",
    roles: "All authenticated roles",
  },
  {
    label: "Patient Profile",
    endpoint: "/api/v1/protected/patient/profile",
    roles: "patient, doctor, admin",
  },
  {
    label: "Doctor Workspace",
    endpoint: "/api/v1/protected/doctor/workspace",
    roles: "doctor, clinic, admin",
  },
  {
    label: "Clinic Overview",
    endpoint: "/api/v1/protected/clinic/overview",
    roles: "clinic, admin",
  },
  {
    label: "Admin Audit Logs",
    endpoint: "/api/v1/protected/admin/audit-logs",
    roles: "admin only",
  },
];

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<ProtectedResourceResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      const [dash, logs] = await Promise.all([
        callProtectedEndpoint("/api/v1/protected/dashboard"),
        getMyAuditLogsRequest(),
      ]);
      setDashboardData(dash as ProtectedResourceResponse);
      setAuditLogs(logs);
    } catch {
      // Handled globally if 401
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">MedAssist AI</p>
              <p className="text-xs text-slate-500">Medical Symptom &amp; Disease Prediction System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-800">{user.full_name}</p>
              <p className="text-[11px] text-slate-500">{user.email}</p>
            </div>
            <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold capitalize text-teal-800">
              {user.role}
            </span>
            {user.role === "patient" ? (
              <button
                type="button"
                onClick={() => navigate("/medical-history")}
                className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
              >
                Medical History
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/patient-history")}
                className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
              >
                Patient Records
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
            >
              My Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              {loggingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {/* Welcome Banner */}
        <section className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-900 to-cyan-900 p-6 text-white shadow-sm sm:p-8">
          <span className="rounded-full bg-teal-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-200">
            {user.role.toUpperCase()} PORTAL
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user.full_name}
          </h1>
          <p className="mt-2 max-w-2xl text-xs text-teal-100/90 sm:text-sm">
            Access AI-driven symptom analysis, disease prediction insights, and clinical healthcare workflows.
          </p>
        </section>

        {/* Primary Healthcare Clinical Actions */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Action 1: Symptom Analysis (Module 2) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500 hover:shadow-md">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <HeartPulse className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">Symptom Checker</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Input current symptoms, validate clinical terms, and calculate co-occurrence correlations across 130+ disease profiles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => alert("Symptom Selection & Analysis is available at /symptoms!")}
              className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-800"
            >
              Start Symptom Check
            </button>
          </div>

          {/* Action 2: Medical History (Module 1) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500 hover:shadow-md">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">Medical History</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                View and manage chronic health conditions, active medications, known allergies, and previous clinical records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              View Medical Records
            </button>
          </div>

          {/* Action 3: Profile Management (Module 1) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500 hover:shadow-md">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <UserIcon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">Profile &amp; Settings</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Review your registered account details, assigned healthcare role, and personal demographic information.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Manage Profile
            </button>
          </div>
        </section>

        {/* Role Capabilities & Activity Summary */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Permitted Role Capabilities */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Your Clinical Capabilities</h2>
            <p className="mt-1 text-xs text-slate-500">
              Assigned role permissions for your <span className="font-semibold capitalize text-teal-800">{user.role}</span> account.
            </p>

            <div className="mt-4 space-y-2.5">
              {(dashboardData?.allowed_actions || []).map((action) => (
                <div key={action} className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming AI Modules */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Platform Healthcare Intelligence</h2>
            <p className="mt-1 text-xs text-slate-500">
              Clinical decision support modules available in MedAssist AI.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <div>
                  <p className="font-semibold text-slate-800">Disease Prediction Engine (Module 3)</p>
                  <p className="text-[11px] text-slate-500">Multi-class ML classification and probability scoring.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                <div>
                  <p className="font-semibold text-slate-800">Health Risk Assessment (Module 4)</p>
                  <p className="text-[11px] text-slate-500">Severity evaluation and emergency red-flag identification.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-800">Treatment &amp; Advisory Guidelines (Module 5)</p>
                  <p className="text-[11px] text-slate-500">Automated lifestyle guidance and consultation recommendations.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Audit Activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Recent Account Activity</h2>
          <p className="mt-1 text-xs text-slate-500">
            Security audit log for your current session.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Event</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 pr-4 font-semibold">Description</th>
                  <th className="py-2 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.slice(0, 5).map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 pr-4 font-mono font-medium text-slate-800">
                      {log.event_type}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${log.success
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                          }`}
                      >
                        {log.success ? "Success" : "Blocked"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">{log.detail}</td>
                    <td className="py-2.5 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

