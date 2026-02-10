import type { SmartTagName, SentimentLevel, TagCategory } from "../lib/types";
import { TAG_CATEGORIES } from "../lib/types";
import {
  Crown,
  Star,
  Cake,
  Heart,
  ShieldAlert,
  AlertTriangle,
  UserX,
  Utensils,
} from "lucide-react";

const CATEGORY_CLASSES: Record<TagCategory, string> = {
  milestone:
    "bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20",
  health:
    "bg-red-50 text-red-700 border-red-200 ring-red-500/20",
  status:
    "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20",
  behavioral:
    "bg-slate-100 text-slate-600 border-slate-200 ring-slate-500/20",
};

const TAG_ICONS: Partial<Record<SmartTagName, React.ReactNode>> = {
  VIP: <Crown className="w-3 h-3" />,
  Celeb: <Star className="w-3 h-3" />,
  Birthday: <Cake className="w-3 h-3" />,
  Anniversary: <Heart className="w-3 h-3" />,
  "Dietary restrictions": <Utensils className="w-3 h-3" />,
  allergies: <ShieldAlert className="w-3 h-3" />,
  "No shows": <UserX className="w-3 h-3" />,
  "frequent visitors": <Star className="w-3 h-3" />,
};

export function TagBadge({ tag }: { tag: SmartTagName }) {
  const category = TAG_CATEGORIES[tag];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ring-1 ${CATEGORY_CLASSES[category]}`}
    >
      {TAG_ICONS[tag]}
      {tag}
    </span>
  );
}

const SENTIMENT_STYLES: Record<SentimentLevel, string> = {
  Positive: "bg-emerald-50 text-emerald-700 border-emerald-300",
  Neutral: "bg-slate-50 text-slate-600 border-slate-300",
  Negative: "bg-orange-50 text-orange-700 border-orange-300",
  Urgent: "bg-red-100 text-red-800 border-red-400 animate-urgent-pulse font-bold",
};

export function SentimentBadge({
  sentiment,
  urgentReason,
}: {
  sentiment: SentimentLevel;
  urgentReason?: string | null;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${SENTIMENT_STYLES[sentiment]}`}
      title={urgentReason || `Sentiment: ${sentiment}`}
    >
      {sentiment === "Urgent" && <AlertTriangle className="w-3.5 h-3.5" />}
      {sentiment}
    </span>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 60
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 font-medium">{pct}%</span>
    </div>
  );
}
