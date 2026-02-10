import { useEffect, useState } from "react";
import { Settings, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { healthCheck } from "../lib/api";

export default function SettingsPage() {
  const [health, setHealth] = useState<{
    status: string;
    service: string;
    groq_configured: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const r = await healthCheck();
      setHealth(r);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          Settings & Status
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          System configuration and API connectivity status.
        </p>
      </div>

      {/* Status card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-slate-800">
            System Status
          </h2>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
          >
            <RefreshCw
              className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          <StatusRow
            label="API Server"
            status={error ? "error" : health ? "ok" : "loading"}
            detail={health?.service || "—"}
          />
          <StatusRow
            label="Groq AI Engine"
            status={
              !health
                ? "loading"
                : health.groq_configured
                  ? "ok"
                  : "warning"
            }
            detail={
              health?.groq_configured
                ? "Connected — Llama-3 active"
                : "Not configured — using regex fallback engine"
            }
          />
          <StatusRow
            label="Database (JSONB)"
            status="info"
            detail="Configured via DATABASE_URL env var"
          />
          <StatusRow
            label="Notifications"
            status="info"
            detail="WhatsApp + Email configured via env vars"
          />
        </div>
      </div>

      {/* Environment variables info */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-sm text-slate-800">
            Environment Variables
          </h2>
        </div>
        <div className="p-5">
          <div className="bg-slate-900 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
            <div className="text-slate-500"># Required</div>
            <div>
              <span className="text-emerald-400">GROQ_API_KEY</span>=gsk_your_key_here
            </div>
            <div className="mt-2 text-slate-500"># Optional</div>
            <div>
              <span className="text-emerald-400">GROQ_MODEL</span>
              =llama-3.1-70b-versatile
            </div>
            <div>
              <span className="text-emerald-400">DATABASE_URL</span>
              =postgresql+asyncpg://...
            </div>
            <div>
              <span className="text-emerald-400">WHATSAPP_API_URL</span>=...
            </div>
            <div>
              <span className="text-emerald-400">WHATSAPP_API_TOKEN</span>=...
            </div>
            <div>
              <span className="text-emerald-400">EMAIL_SMTP_HOST</span>=...
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Set these in your Vercel project settings under Environment Variables.
            The app works without GROQ_API_KEY using the deterministic fallback
            engine.
          </p>
        </div>
      </div>

      {/* Tag reference */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-sm text-slate-800">
            CRM Tag Reference
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-600">
                Tag
              </th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-600">
                Category
              </th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-600">
                Badge Color
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              ["VIP", "Status", "Gold"],
              ["Celeb", "Status", "Gold"],
              ["frequent visitors", "Status", "Gold"],
              ["Birthday", "Milestone", "Blue"],
              ["Anniversary", "Milestone", "Blue"],
              ["No shows", "Behavioral", "Gray"],
              ["Dietary restrictions", "Health", "Red"],
              ["allergies", "Health", "Red"],
            ].map(([tag, cat, color]) => (
              <tr key={tag} className="hover:bg-slate-50">
                <td className="px-5 py-2.5 font-medium text-slate-800">
                  {tag}
                </td>
                <td className="px-5 py-2.5 text-slate-600">{cat}</td>
                <td className="px-5 py-2.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      color === "Gold"
                        ? "bg-amber-50 text-amber-700"
                        : color === "Blue"
                          ? "bg-blue-50 text-blue-700"
                          : color === "Red"
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {color}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: "ok" | "error" | "warning" | "loading" | "info";
  detail: string;
}) {
  return (
    <div className="px-5 py-3.5 flex items-center gap-3">
      {status === "ok" && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />}
      {status === "error" && <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />}
      {status === "warning" && (
        <div className="w-4.5 h-4.5 rounded-full bg-amber-400 shrink-0" />
      )}
      {status === "loading" && (
        <RefreshCw className="w-4.5 h-4.5 text-slate-400 animate-spin shrink-0" />
      )}
      {status === "info" && (
        <div className="w-4.5 h-4.5 rounded-full bg-slate-300 shrink-0" />
      )}
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
