/**
 * SmartTagBadge — Reusable React component for rendering CRM smart tags.
 *
 * Color coding per spec:
 *   - Milestones (Birthday, Anniversary)       → Blue
 *   - Health / Allergies (Dietary, allergies)   → Red
 *   - Status (VIP, Celeb, frequent visitors)    → Gold
 *   - Behavioral (No shows)                     → Gray
 *   - Urgent sentiment                          → Pulsing red border
 */

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────

type SmartTagName =
  | "VIP"
  | "Celeb"
  | "frequent visitors"
  | "Birthday"
  | "Anniversary"
  | "No shows"
  | "Dietary restrictions"
  | "allergies";

type SentimentLevel = "Positive" | "Neutral" | "Negative" | "Urgent";

interface SmartTagPayload {
  tags: SmartTagName[];
  sentiment: SentimentLevel;
  confidence: number;
  summary: string;
  analyzed_at: string;
  urgent_reason?: string | null;
}

interface SmartTagBadgeProps {
  /** The full smart_tags payload from the API. */
  smartTags: SmartTagPayload;
  /** Render as compact inline badges (default) or expanded card view. */
  variant?: "inline" | "card";
}

// ── Color mapping ─────────────────────────────────────────────────────────

type TagCategory = "milestone" | "health" | "status" | "behavioral";

const TAG_CATEGORIES: Record<SmartTagName, TagCategory> = {
  Birthday: "milestone",
  Anniversary: "milestone",
  "Dietary restrictions": "health",
  allergies: "health",
  VIP: "status",
  Celeb: "status",
  "frequent visitors": "status",
  "No shows": "behavioral",
};

const CATEGORY_STYLES: Record<TagCategory, React.CSSProperties> = {
  milestone: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    border: "1px solid #93c5fd",
  },
  health: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
  },
  status: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fcd34d",
  },
  behavioral: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
  },
};

const CATEGORY_ICONS: Record<TagCategory, string> = {
  milestone: "🎂",
  health: "⚕️",
  status: "⭐",
  behavioral: "📋",
};

const SENTIMENT_COLORS: Record<SentimentLevel, string> = {
  Positive: "#16a34a",
  Neutral: "#6b7280",
  Negative: "#dc2626",
  Urgent: "#dc2626",
};

// ── Styles ────────────────────────────────────────────────────────────────

const baseTagStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 10px",
  borderRadius: "9999px",
  fontSize: "12px",
  fontWeight: 600,
  lineHeight: "20px",
  whiteSpace: "nowrap",
};

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  alignItems: "center",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const urgentPulseKeyframes = `
@keyframes urgentPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
}
`;

// ── Sub-components ────────────────────────────────────────────────────────

const TagBadge: React.FC<{ tag: SmartTagName }> = ({ tag }) => {
  const category = TAG_CATEGORIES[tag];
  const style = { ...baseTagStyle, ...CATEGORY_STYLES[category] };
  const icon = CATEGORY_ICONS[category];

  return (
    <span style={style} title={`Category: ${category}`}>
      <span aria-hidden="true">{icon}</span>
      {tag}
    </span>
  );
};

const SentimentIndicator: React.FC<{
  sentiment: SentimentLevel;
  urgentReason?: string | null;
}> = ({ sentiment, urgentReason }) => {
  const color = SENTIMENT_COLORS[sentiment];
  const isUrgent = sentiment === "Urgent";

  const style: React.CSSProperties = {
    ...baseTagStyle,
    backgroundColor: isUrgent ? "#fee2e2" : "#f9fafb",
    color,
    border: `1px solid ${color}`,
    fontWeight: 700,
    ...(isUrgent
      ? { animation: "urgentPulse 1.5s ease-in-out infinite" }
      : {}),
  };

  return (
    <span
      style={style}
      title={isUrgent && urgentReason ? urgentReason : `Sentiment: ${sentiment}`}
    >
      {isUrgent && <span aria-hidden="true">🚨</span>}
      {sentiment}
    </span>
  );
};

// ── Main component ────────────────────────────────────────────────────────

const SmartTagBadge: React.FC<SmartTagBadgeProps> = ({
  smartTags,
  variant = "inline",
}) => {
  const { tags, sentiment, confidence, summary, urgent_reason } = smartTags;

  if (variant === "inline") {
    return (
      <>
        <style>{urgentPulseKeyframes}</style>
        <div style={containerStyle} role="list" aria-label="Smart tags">
          <SentimentIndicator
            sentiment={sentiment}
            urgentReason={urgent_reason}
          />
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      </>
    );
  }

  // Card variant — expanded view with summary and confidence
  return (
    <>
      <style>{urgentPulseKeyframes}</style>
      <div
        style={{
          ...cardStyle,
          ...(sentiment === "Urgent"
            ? { borderColor: "#dc2626", borderWidth: "2px" }
            : {}),
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>
            AI Smart Tags
          </span>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            Confidence: {(confidence * 100).toFixed(0)}%
          </span>
        </div>

        {/* Tags */}
        <div
          style={{ ...containerStyle, marginBottom: "12px" }}
          role="list"
          aria-label="Smart tags"
        >
          <SentimentIndicator
            sentiment={sentiment}
            urgentReason={urgent_reason}
          />
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>

        {/* Summary */}
        {summary && (
          <p
            style={{
              fontSize: "13px",
              color: "#374151",
              margin: "0 0 8px 0",
              lineHeight: "1.4",
            }}
          >
            {summary}
          </p>
        )}

        {/* Urgent reason callout */}
        {sentiment === "Urgent" && urgent_reason && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "12px",
              color: "#991b1b",
              fontWeight: 500,
            }}
            role="alert"
          >
            <strong>⚠ Urgent:</strong> {urgent_reason}
          </div>
        )}
      </div>
    </>
  );
};

export default SmartTagBadge;
export type { SmartTagBadgeProps, SmartTagPayload, SmartTagName, SentimentLevel };
