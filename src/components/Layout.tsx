import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  History,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/analyze", icon: Sparkles, label: "Tag Analyzer" },
  { to: "/history", icon: History, label: "History" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
          <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">
            eM
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">eMenu Tables</div>
            <div className="text-[10px] text-slate-400 tracking-wider uppercase">
              Smart Tagging
            </div>
          </div>
          <button
            className="lg:hidden ml-auto text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="mt-6 px-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
              end={to === "/"}
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
              ST
            </div>
            <div>
              <div className="text-xs font-medium">Staff User</div>
              <div className="text-[10px] text-slate-400">Restaurant Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center gap-4 px-4 lg:px-8 py-3">
            <button
              className="lg:hidden text-slate-600 hover:text-slate-900"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-slate-800">
              AI-Powered Smart Tagging & Sentiment Analysis
            </h1>
            <div className="ml-auto flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Online
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
