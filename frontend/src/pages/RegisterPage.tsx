import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { formatAuthErrorMessage } from "../services/api";
import type { RegisterPayload } from "../types/auth";

const ROLE_OPTIONS: Array<{ value: RegisterPayload["role"]; label: string; hint: string }> = [
  { value: "patient", label: "Patient", hint: "Symptom checker & personal health reports" },
  { value: "doctor", label: "Doctor", hint: "Clinical triage & prediction review" },
  { value: "clinic", label: "Clinic", hint: "Facility intake & analytics dashboard" },
];

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RegisterPayload["role"]>("patient");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const hasMinLen = password.length >= 8;
  const hasLetterAndDigit = /[A-Za-z]/.test(password) && /\d/.test(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (fullName.trim().length < 2) {
      setErrorMessage("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!hasMinLen || !hasLetterAndDigit) {
      setErrorMessage("Password must be at least 8 characters and include a letter and a number.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await register(
        {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        },
        true
      );
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErrorMessage(formatAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register as a Patient, Doctor, or Clinic to use MedAssist AI."
    >
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="reg-name" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="reg-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Meera Nair"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-3 focus:ring-teal-600/15"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Email Address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@hospital.org"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-3 focus:ring-teal-600/15"
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Account Role</span>
          <div className="grid grid-cols-3 gap-2">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                title={option.hint}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  role === option.value
                    ? "border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="reg-password" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 chars with a number"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-3 focus:ring-teal-600/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1.5 flex gap-3 text-[11px]">
            <span className={hasMinLen ? "text-teal-700 font-medium" : "text-slate-400"}>
              • 8+ characters
            </span>
            <span className={hasLetterAndDigit ? "text-teal-700 font-medium" : "text-slate-400"}>
              • Letter &amp; number
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-confirm"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Confirm Password
          </label>
          <input
            id="reg-confirm"
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-3 focus:ring-teal-600/15"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-800 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

