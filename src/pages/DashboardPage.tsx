import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Users,
  ShieldAlert,
  TrendingUp,
  ArrowRight,
  Zap,
  Brain,
  Bell,
  Tags,
} from "lucide-react";
import { healthCheck, getAnalysisHistory } from "../lib/api";
import type { AnalysisHistoryEntry } from "../lib/types";
import { TagBadge, SentimentBadge } from "../components/SmartTagBadge";

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState<"loading" | "online" | "offline">(
    "loading"
  );
  const [groqConfigured, setGroqConfigured] = useState(false);
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);

  useEffect(() => {
    healthCheck()
      .then((r) => {
        setApiStatus("online");
        setGroqConfigured(r.groq_configured);
      })
      .catch(() => setApiStatus("offline"));

    getAnalysisHistory()
      .then((r) => setHistory(r.history))
      .catch(() => {});
  }, []);

  const urgentCount = history.filter(
    (h) => h.smart_tags.sentiment === "Urgent"
  ).length;
  const totalTags = history.reduce(
    (acc, h) => acc + h.smart_tags.tags.length,
    0
  );

  const stats = [
    {
      label: "Total Analyses",
      value: history.length,
      icon: Sparkles,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Urgent Alerts",
      value: urgentCount,
      icon: ShieldAlert,
      color: "text-red-600 bg-red-50",
    },
    {
      label: "Tags Generated",
      value: totalTags,
      icon: Tags,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Avg Confidence",
      value:
        history.length > 0
          ? `${Math.round((history.reduce((a, h) => a + h.smart_tags.confidence, 0) / history.length) * 100)}%`
          : "—",
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 lg:p-10 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <Brain className="w-4 h-4" />
            AI-Powered CRM Intelligence
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Smart Tagging & Sentiment Analysis
          </h1>
          <p className="mt-2 text-indigo-100 max-w-xl text-sm lg:text-base leading-relaxed">
            Automatically analyze guest reservation requests to extract CRM tags,
            detect dietary restrictions and allergies, and trigger urgent
            notifications for medical alerts — powered by Groq Llama-3.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20"
            >
              <Sparkles className="w-4 h-4" />
              Start Analyzing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-medium border ${
            apiStatus === "online"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : apiStatus === "offline"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-slate-50 text-slate-500 border-slate-200"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              apiStatus === "online"
                ? "bg-emerald-500"
                : apiStatus === "offline"
                  ? "bg-red-500"
                  : "bg-slate-400 animate-pulse"
            }`}
          />
          API {apiStatus === "loading" ? "Connecting..." : apiStatus === "online" ? "Online" : "Offline"}
        </span>
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-medium border ${
            groqConfigured
              ? "bg-purple-50 text-purple-700 border-purple-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Groq AI:{" "}
          {groqConfigured ? "Connected" : "Using Fallback Engine"}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}>
                <s.icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Features grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">How It Works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Brain,
              title: "AI Tag Extraction",
              desc: "Groq Llama-3 analyzes free-text special requests and dietary preferences to auto-generate CRM-spec tags.",
              color: "text-indigo-600 bg-indigo-50",
            },
            {
              icon: ShieldAlert,
              title: "Urgent Detection",
              desc: "Dual-layer scanning (regex + LLM) catches anaphylaxis, epipen, severe allergy, and medical alerts.",
              color: "text-red-600 bg-red-50",
            },
            {
              icon: Bell,
              title: "Instant Notifications",
              desc: "Urgent sentiment triggers immediate in-system, WhatsApp, and email alerts to kitchen and front-of-house.",
              color: "text-amber-600 bg-amber-50",
            },
            {
              icon: Tags,
              title: "CRM-Spec Tags",
              desc: "VIP, Celeb, frequent visitors, Birthday, Anniversary, No shows, Dietary restrictions, allergies.",
              color: "text-purple-600 bg-purple-50",
            },
            {
              icon: Users,
              title: "Multi-Tenant Isolation",
              desc: "All data is scoped by tenant_id — tags never leak between restaurants in the SaaS platform.",
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              icon: Zap,
              title: "Graceful Fallback",
              desc: "If Groq is unavailable, a deterministic regex engine still produces valid tags with 55% baseline confidence.",
              color: "text-cyan-600 bg-cyan-50",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex p-2 rounded-lg ${f.color} mb-3`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">{f.title}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent analyses */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Recent Analyses
            </h2>
            <Link
              to="/history"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {history.slice(0, 3).map((entry) => (
              <div
                key={entry.id}
                className={`animate-slide-in bg-white rounded-lg border p-4 flex flex-wrap items-center gap-3 ${
                  entry.smart_tags.sentiment === "Urgent"
                    ? "border-red-200"
                    : "border-slate-200"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {entry.customer_name || "Guest"}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {entry.smart_tags.summary}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <SentimentBadge
                    sentiment={entry.smart_tags.sentiment}
                    urgentReason={entry.smart_tags.urgent_reason}
                  />
                  {entry.smart_tags.tags.slice(0, 3).map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                  {entry.smart_tags.tags.length > 3 && (
                    <span className="text-xs text-slate-400">
                      +{entry.smart_tags.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
