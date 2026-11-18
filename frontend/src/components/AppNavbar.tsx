import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const isPatient = user.role === "patient";

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/symptoms", label: "Symptom Checker", icon: HeartPulse },
    isPatient
      ? { to: "/medical-history", label: "Medical History", icon: ClipboardList }
      : { to: "/patient-history", label: "Patient Records", icon: ClipboardList },
    { to: "/profile", label: "Profile", icon: UserIcon },
  ];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link
          to="/dashboard"
          className="flex items-center gap-3 focus:outline-none"
          onClick={() => setMobileMenuOpen(false)}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-slate-900">MedAssist AI</p>
            <p className="hidden text-[11px] text-slate-500 sm:block">
              Clinical Decision Support
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200/80"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User & Sign Out (Desktop) */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="hidden text-right lg:block">
            <p className="max-w-[160px] truncate text-xs font-semibold text-slate-800">
              {user.full_name}
            </p>
            <p className="max-w-[160px] truncate text-[11px] text-slate-500">
              {user.email}
            </p>
          </div>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-teal-800">
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

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-teal-800">
            {user.role}
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3 md:hidden">
          <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold text-slate-800">{user.full_name}</p>
            <p className="text-[11px] text-slate-500">{user.email}</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-teal-50 text-teal-800"
                        : "text-slate-700 hover:bg-slate-100"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      )}
    </header>
  );
}
