import type { AnalyzeTagsResponse } from "../lib/types";
import { TagBadge, SentimentBadge, ConfidenceMeter } from "./SmartTagBadge";
import {
  Bell,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface ResultCardProps {
  result: AnalyzeTagsResponse;
}

export default function ResultCard({ result }: ResultCardProps) {
  const { smart_tags, notification_triggered, customer_name, reservation_id } =
    result;
  const isUrgent = smart_tags.sentiment === "Urgent";

  return (
    <div
      className={`
        animate-fade-in rounded-xl border-2 bg-white shadow-sm overflow-hidden
        ${isUrgent ? "border-red-400 shadow-red-100" : "border-slate-200"}
      `}
    >
      {/* Urgent banner */}
      {isUrgent && (
        <div className="bg-red-600 px-4 py-2.5 flex items-center gap-2 text-white text-sm font-semibold">
          <AlertTriangle className="w-4 h-4" />
          URGENT — Medical / Allergy Alert Detected
          {notification_triggered && (
            <span className="ml-auto inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-xs">
              <Bell className="w-3 h-3" />
              Notification Sent
            </span>
          )}
        </div>
      )}

      <div className="p-5 space-y-5">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {customer_name || "Guest"}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Reservation: {reservation_id.slice(0, 8)}...
            </p>
          </div>
          <SentimentBadge
            sentiment={smart_tags.sentiment}
            urgentReason={smart_tags.urgent_reason}
          />
        </div>

        {/* Tags */}
        {smart_tags.tags.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Detected Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {smart_tags.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {smart_tags.summary && (
          <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3">
            <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-700 leading-relaxed">
              {smart_tags.summary}
            </p>
          </div>
        )}

        {/* Urgent reason callout */}
        {isUrgent && smart_tags.urgent_reason && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Urgent Reason</p>
              <p className="text-sm text-red-700 mt-0.5">
                {smart_tags.urgent_reason}
              </p>
            </div>
          </div>
        )}

        {/* Footer meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {smart_tags.analyzed_at
              ? new Date(smart_tags.analyzed_at).toLocaleString()
              : "Just now"}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-medium">Confidence:</span>
              <ConfidenceMeter value={smart_tags.confidence} />
            </div>
            {notification_triggered && !isUrgent && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Notified
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
