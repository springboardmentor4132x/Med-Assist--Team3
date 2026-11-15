import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  ApiError,
  callProtectedEndpoint,
  formatAuthErrorMessage,
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
  const { user, logout, refreshSession } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<ProtectedResourceResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [probeResult, setProbeResult] = useState<{
    endpoint: string;
    status: number;
    ok: boolean;
    body: unknown;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
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
      // Handled globally by authorizedFetch session expiry handler if 401
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

  async function handleRotateToken() {
    setStatusMessage(null);
    try {
      await refreshSession();
      setStatusMessage("Access & refresh JWT tokens rotated successfully.");
      await loadInitialData();
    } catch (err) {
      setStatusMessage(formatAuthErrorMessage(err));
    }
  }

  async function handleProbeRoute(endpoint: string) {
    try {
      const data = await callProtectedEndpoint(endpoint);
      setProbeResult({ endpoint, status: 200, ok: true, body: data });
    } catch (err) {
      if (err instanceof ApiError) {
        setProbeResult({
          endpoint,
          status: err.status,
          ok: false,
          body: { error_code: err.errorCode, detail: err.message },
        });
      }
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">MedAssist AI</p>
              <p className="text-xs text-slate-500">Authenticated Portal &amp; RBAC Gateway</p>
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
        {statusMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-medium text-teal-900">
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
            {statusMessage}
          </div>
        )}

        {/* Session Summary + Capabilities */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h1 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <ShieldCheck className="h-5 w-5 text-teal-700" />
                Verified JWT Session
              </h1>
              <button
                type="button"
                onClick={handleRotateToken}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Rotate Token
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Account Role</dt>
                <dd className="mt-0.5 font-semibold capitalize text-slate-900">{user.role}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Account Status</dt>
                <dd className="mt-0.5 font-semibold text-emerald-700">
                  {user.is_active ? "Active" : "Inactive"}
                </dd>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Permitted Role Actions</dt>
                <dd className="mt-1.5 space-y-1 text-slate-700">
                  {(dashboardData?.allowed_actions || []).map((action) => (
                    <div key={action} className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-teal-600" />
                      <span>{action}</span>
                    </div>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          {/* Protected RBAC Route Verification */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <KeyRound className="h-5 w-5 text-teal-700" />
              Protected API &amp; RBAC Verifier
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Test role-based access enforcement across MedAssist AI protected routes.
            </p>

            <div className="mt-4 space-y-2">
              {PROTECTED_ROUTES_TO_TEST.map((item) => (
                <button
                  key={item.endpoint}
                  type="button"
                  onClick={() => handleProbeRoute(item.endpoint)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2 text-left text-xs transition hover:border-teal-400 hover:bg-teal-50/40"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{item.label}</p>
                    <p className="font-mono text-[11px] text-slate-400">{item.endpoint}</p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {item.roles}
                  </span>
                </button>
              ))}
            </div>

            {probeResult && (
              <div
                className={`mt-4 rounded-xl border p-3 text-xs ${
                  probeResult.ok
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                    : "border-rose-200 bg-rose-50/70 text-rose-950"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {probeResult.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                  )}
                  <span>
                    HTTP {probeResult.status} — {probeResult.endpoint}
                  </span>
                </div>
                <pre className="mt-2 max-h-36 overflow-auto rounded-lg bg-white/80 p-2 font-mono text-[11px] text-slate-800">
                  {JSON.stringify(probeResult.body, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* Recent Auth Audit Logs */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Your Authentication Activity</h2>
          <p className="mt-1 text-xs text-slate-500">
            Security audit trail recorded by the MedAssist AI authentication gateway.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Event</th>
                  <th className="py-2 pr-4 font-semibold">Outcome</th>
                  <th className="py-2 pr-4 font-semibold">Detail</th>
                  <th className="py-2 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 pr-4 font-mono font-medium text-slate-800">
                      {log.event_type}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          log.success
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {log.success ? "Success" : "Blocked"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{log.detail}</td>
                    <td className="py-2 text-slate-400">
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

