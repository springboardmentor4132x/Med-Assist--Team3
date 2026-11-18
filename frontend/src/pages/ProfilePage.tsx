import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  Mail,
  ShieldCheck,
  CalendarDays,
  Clock,
  Pencil,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Building2,
  UserCog,
  FileHeart,
} from "lucide-react";

import { AppNavbar } from "../components/AppNavbar";
import { useAuth } from "../context/AuthContext";
import {
  ApiError,
  getMyProfileRequest,
  updateMyProfileRequest,
  type Profile,
} from "../services/api";

const roleDetails: Record<
  string,
  { title: string; description: string; icon: typeof UserRound }
> = {
  patient: {
    title: "Patient",
    description: "Access your personal profile and patient services.",
    icon: UserRound,
  },
  doctor: {
    title: "Doctor",
    description: "Access your professional workspace and authorized patient services.",
    icon: Stethoscope,
  },
  clinic: {
    title: "Clinic",
    description: "Access clinic management and authorized clinical services.",
    icon: Building2,
  },
  admin: {
    title: "Administrator",
    description: "Manage platform administration and authorized system resources.",
    icon: UserCog,
  },
};

export function ProfilePage() {
  const { user, setSessionNotice, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const data = await getMyProfileRequest();

        if (active) {
          setProfile(data);
          setFullName(data.full_name);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to load your profile. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    const cleanedName = fullName.trim();

    if (cleanedName.length < 2 || cleanedName.length > 120) {
      setError("Name must contain between 2 and 120 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updated = await updateMyProfileRequest(cleanedName);

      setProfile(updated);
      setFullName(updated.full_name);
      setEditing(false);
      setSuccess("Your profile has been updated successfully.");

      // Keep the authenticated user information synchronized across navbar and dashboard.
      updateUser({ full_name: updated.full_name });
      setSessionNotice(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setFullName(profile?.full_name ?? "");
    setEditing(false);
    setError("");
    setSuccess("");
  }

  const role = (profile?.role ?? user?.role ?? "patient").toLowerCase();
  const details = roleDetails[role] ?? roleDetails.patient;
  const RoleIcon = details.icon;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-600">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">
            Profile unavailable
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {error || "We could not retrieve your profile."}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-5 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNavbar />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            My Profile
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            View and manage your MedAssist AI account information.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-teal-800 to-cyan-700 px-6 py-8 text-white sm:px-8">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15">
                <UserRound className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{profile.full_name}</h3>
                <p className="mt-1 text-sm text-teal-50">{profile.email}</p>
                <span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold capitalize">
                  {profile.role}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">
                  Personal Information
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Your registered account details.
                </p>
              </div>

              {!editing && (
                <button
                  onClick={() => {
                    setEditing(true);
                    setSuccess("");
                    setError("");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </button>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Full Name
                </label>
                {editing ? (
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    maxLength={120}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                    <UserRound className="h-5 w-5 text-teal-700" />
                    <span className="text-sm font-medium text-slate-800">
                      {profile.full_name}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Email Address
                </label>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                  <Mail className="h-5 w-5 text-teal-700" />
                  <span className="break-all text-sm text-slate-800">
                    {profile.email}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Email cannot be changed here.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Account Role
                </label>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                  <ShieldCheck className="h-5 w-5 text-teal-700" />
                  <span className="text-sm font-medium capitalize text-slate-800">
                    {profile.role}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Role changes are restricted to authorized administration.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Account Status
                </label>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      profile.is_active ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {profile.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Account Created
                </label>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                  <CalendarDays className="h-5 w-5 text-teal-700" />
                  <span className="text-sm text-slate-800">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Last Login
                </label>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                  <Clock className="h-5 w-5 text-teal-700" />
                  <span className="text-sm text-slate-800">
                    {profile.last_login_at
                      ? new Date(profile.last_login_at).toLocaleString()
                      : "Not available"}
                  </span>
                </div>
              </div>
            </div>

            {editing && (
              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-3">
              <RoleIcon className="h-6 w-6 text-teal-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Role & Access Information
              </h3>
              <p className="text-xs text-slate-500">
                Your account's assigned platform role.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold capitalize text-slate-900">
              {details.title}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {details.description}
            </p>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Account roles and clinical permissions are managed by your healthcare organization administrator.
          </p>
        </section>

        {role === "patient" && (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-teal-50 p-3">
                <FileHeart className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  Patient Medical History
                </h3>
                <p className="text-xs text-slate-500">
                  Manage your chronic conditions, allergies, medications, and lifestyle factors.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/medical-history")}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Manage Medical History
            </button>
          </section>
        )}
      </main>
    </div>
  );
}