import { useEffect, useState } from "react";
import { History, RefreshCw, Inbox } from "lucide-react";
import { getAnalysisHistory } from "../lib/api";
import type { AnalysisHistoryEntry } from "../lib/types";
import { TagBadge, SentimentBadge, ConfidenceMeter } from "../components/SmartTagBadge";

export default function HistoryPage() {
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await getAnalysisHistory();
      setHistory(r.history);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            Analysis History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            All tag analyses from the current session ({history.length} total).
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {history.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Inbox className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">No analyses yet</p>
          <p className="text-xs mt-1">
            Run a tag analysis to see results here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry, idx) => (
            <div
              key={entry.id}
              className={`animate-slide-in bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${
                entry.smart_tags.sentiment === "Urgent"
                  ? "border-red-300 bg-red-50/30"
                  : "border-slate-200"
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {entry.customer_name || "Guest"}
                    </h3>
                    <SentimentBadge
                      sentiment={entry.smart_tags.sentiment}
                      urgentReason={entry.smart_tags.urgent_reason}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {entry.reservation_id.slice(0, 8)}... &middot;{" "}
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <ConfidenceMeter value={entry.smart_tags.confidence} />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {entry.smart_tags.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>

              {/* Summary */}
              {entry.smart_tags.summary && (
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  {entry.smart_tags.summary}
                </p>
              )}

              {/* Urgent callout */}
              {entry.smart_tags.sentiment === "Urgent" &&
                entry.smart_tags.urgent_reason && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                    <strong>Urgent:</strong> {entry.smart_tags.urgent_reason}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
