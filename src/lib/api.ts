import type {
  AnalyzeTagsRequest,
  AnalyzeTagsResponse,
  AnalysisHistoryEntry,
  DemoScenario,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export async function analyzeTags(
  req: AnalyzeTagsRequest
): Promise<AnalyzeTagsResponse> {
  return request("/v1/reservations/analyze-tags", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getAnalysisHistory(): Promise<{
  history: AnalysisHistoryEntry[];
  total: number;
}> {
  return request("/v1/analysis-history");
}

export async function getDemoScenarios(): Promise<{
  scenarios: DemoScenario[];
}> {
  return request("/v1/demo-scenarios");
}

export async function healthCheck(): Promise<{
  status: string;
  service: string;
  groq_configured: boolean;
}> {
  return request("/health");
}
