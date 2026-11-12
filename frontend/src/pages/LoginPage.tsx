import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { ApiError, fetchDemoAccounts, formatAuthErrorMessage } from "../services/api";
import type { DemoAccount } from "../types/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { login, isAuthenticated, sessionNotice, setSessionNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    let active = true;
    void fetchDemoAccounts().then((accounts) => {
      if (active) setDemoAccounts(accounts);
    });
    return () => {
      active = false;
    };
  }, []);

  function validateForm(): boolean {
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      nextErrors.email = "Email address is required.";
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      nextErrors.password = "Password is required.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setSessionNotice(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: email.trim().toLowerCase(), password }, rememberMe);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setErrorMessage(formatAuthErrorMessage(err));
      if (err instanceof ApiError) {
        setErrorCode(err.errorCode);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function applyDemoAccount(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setFieldErrors({});
    setErrorMessage(null);
    setErrorCode(null);
  }

  return (
    <AuthLayout
      title="Sign in to MedAssist AI"
      subtitle="Access symptom analysis, disease predictions, and clinical dashboards."
    >
      {sessionNotice && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-teal-200 bg-teal-50/80 px-3.5 py-3 text-xs text-teal-900"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <span>{sessionNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">{errorMessage}</p>
            {errorCode && (
              <p className="mt-0.5 font-mono text-[11px] text-rose-600/90">Code: {errorCode}</p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Email Address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="name@medassist.ai"
              aria-invalid={Boolean(fieldErrors.email)}
              className={`w-full rounded-xl border bg-slate-50/60 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-3 ${
                fieldErrors.email
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
                  : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/15"
              }`}
            />
          </div>
          {fieldErrors.email && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              placeholder="Enter your password"
              aria-invalid={Boolean(fieldErrors.password)}
              className={`w-full rounded-xl border bg-slate-50/60 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-3 ${
                fieldErrors.password
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
                  : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/15"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.password}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Remember me on this device
          </label>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            JWT Secured
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-700/20 transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-600/25 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      {demoAccounts.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Dev Quick-Fill Roles
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => applyDemoAccount(account)}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:border-teal-400 hover:bg-teal-50/50"
              >
                <span className="capitalize">{account.role}</span>
                <span className="text-[10px] text-slate-400">Fill</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-600">
        New to MedAssist AI?{" "}
        <Link to="/register" className="font-semibold text-teal-700 hover:text-teal-800 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

