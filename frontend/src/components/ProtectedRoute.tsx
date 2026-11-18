import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-teal-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Verifying secure session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Access Restricted</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your signed-in role (<span className="font-semibold capitalize">{user.role}</span>) does not have
            permission to view this section.
          </p>
          <Link
            to="/dashboard"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

