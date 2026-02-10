import { useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  Lightbulb,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { analyzeTags, getDemoScenarios } from "../lib/api";
import type { AnalyzeTagsResponse, DemoScenario } from "../lib/types";
import ResultCard from "../components/ResultCard";

export default function AnalyzePage() {
  const [specialRequest, setSpecialRequest] = useState("");
  const [dietaryPrefs, setDietaryPrefs] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeTagsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [scenarioOpen, setScenarioOpen] = useState(false);

  useEffect(() => {
    getDemoScenarios()
      .then((r) => setScenarios(r.scenarios))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!specialRequest.trim() && !dietaryPrefs.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await analyzeTags({
        special_request_text: specialRequest,
        dietary_preferences: dietaryPrefs,
        customer_name: customerName || undefined,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function loadScenario(scenario: DemoScenario) {
    setCustomerName(scenario.customer_name);
    setSpecialRequest(scenario.special_request_text);
    setDietaryPrefs(scenario.dietary_preferences);
    setResult(null);
    setError(null);
    setScenarioOpen(false);
  }

  function handleReset() {
    setCustomerName("");
    setSpecialRequest("");
    setDietaryPrefs("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Tag Analyzer
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter reservation special requests and dietary preferences to generate
          AI-powered CRM tags and sentiment analysis.
        </p>
      </div>

      {/* Demo scenarios */}
      {scenarios.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setScenarioOpen(!scenarioOpen)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
          >
            <Lightbulb className="w-4 h-4" />
            Load Demo Scenario
            <ChevronDown
              className={`w-4 h-4 transition-transform ${scenarioOpen ? "rotate-180" : ""}`}
            />
          </button>
          {scenarioOpen && (
            <div className="absolute z-10 mt-2 w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-2 space-y-1">
              {scenarios.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => loadScenario(s)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {s.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {s.special_request_text}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Customer name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Customer Name
              <span className="text-slate-400 font-normal"> (optional)</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. James Whitfield"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Dietary preferences */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Dietary Preferences
            </label>
            <input
              type="text"
              value={dietaryPrefs}
              onChange={(e) => setDietaryPrefs(e.target.value)}
              placeholder="e.g. Vegetarian, nut-free, halal"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Special request */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Special Request Text
          </label>
          <textarea
            value={specialRequest}
            onChange={(e) => setSpecialRequest(e.target.value)}
            rows={4}
            placeholder="e.g. This is our anniversary dinner. My wife has a severe nut allergy — she carries an epipen. Please arrange a window seat with candles."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">
            {specialRequest.length}/2000 characters
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={
              loading || (!specialRequest.trim() && !dietaryPrefs.trim())
            }
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? "Analyzing..." : "Analyze Tags"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="animate-fade-in bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Result */}
      {result && <ResultCard result={result} />}
    </div>
  );
}
