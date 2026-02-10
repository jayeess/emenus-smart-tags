export type SmartTagName =
  | "VIP"
  | "Celeb"
  | "frequent visitors"
  | "Birthday"
  | "Anniversary"
  | "No shows"
  | "Dietary restrictions"
  | "allergies";

export type SentimentLevel = "Positive" | "Neutral" | "Negative" | "Urgent";

export interface SmartTagPayload {
  tags: SmartTagName[];
  sentiment: SentimentLevel;
  confidence: number;
  summary: string;
  analyzed_at: string;
  urgent_reason?: string | null;
}

export interface AnalyzeTagsRequest {
  reservation_id?: string;
  special_request_text: string;
  dietary_preferences: string;
  tenant_id?: string;
  customer_name?: string;
}

export interface AnalyzeTagsResponse {
  reservation_id: string;
  tenant_id: string;
  customer_name?: string;
  smart_tags: SmartTagPayload;
  notification_triggered: boolean;
}

export interface AnalysisHistoryEntry {
  id: string;
  reservation_id: string;
  customer_name?: string;
  smart_tags: SmartTagPayload;
  created_at: string;
}

export interface DemoScenario {
  name: string;
  customer_name: string;
  special_request_text: string;
  dietary_preferences: string;
}

export type TagCategory = "milestone" | "health" | "status" | "behavioral";

export const TAG_CATEGORIES: Record<SmartTagName, TagCategory> = {
  Birthday: "milestone",
  Anniversary: "milestone",
  "Dietary restrictions": "health",
  allergies: "health",
  VIP: "status",
  Celeb: "status",
  "frequent visitors": "status",
  "No shows": "behavioral",
};
