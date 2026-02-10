"""
Vercel Serverless Python API — Smart Tagging & Sentiment Analysis.

Single-file FastAPI app that runs as a Vercel serverless function.
All backend logic is self-contained here for Vercel's Python runtime.
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart-tags")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="eMenu Tables — Smart Tagging API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Enums & Schemas
# ---------------------------------------------------------------------------

class SentimentLevel(str, Enum):
    POSITIVE = "Positive"
    NEUTRAL = "Neutral"
    NEGATIVE = "Negative"
    URGENT = "Urgent"


class SmartTagName(str, Enum):
    VIP = "VIP"
    CELEB = "Celeb"
    FREQUENT_VISITORS = "frequent visitors"
    BIRTHDAY = "Birthday"
    ANNIVERSARY = "Anniversary"
    NO_SHOWS = "No shows"
    DIETARY_RESTRICTIONS = "Dietary restrictions"
    ALLERGIES = "allergies"


class AnalyzeTagsRequest(BaseModel):
    reservation_id: str = Field(default_factory=lambda: str(uuid4()))
    special_request_text: str = Field(default="", max_length=2000)
    dietary_preferences: str = Field(default="", max_length=1000)
    tenant_id: str = Field(default_factory=lambda: str(uuid4()))
    customer_name: Optional[str] = None


class SmartTagPayload(BaseModel):
    tags: list[SmartTagName] = Field(default_factory=list)
    sentiment: SentimentLevel = Field(default=SentimentLevel.NEUTRAL)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    summary: str = Field(default="", max_length=500)
    analyzed_at: str = Field(default="")
    urgent_reason: Optional[str] = Field(default=None, max_length=300)


class AnalyzeTagsResponse(BaseModel):
    reservation_id: str
    tenant_id: str
    customer_name: Optional[str] = None
    smart_tags: SmartTagPayload
    notification_triggered: bool = False


class AnalysisHistoryEntry(BaseModel):
    id: str
    reservation_id: str
    customer_name: Optional[str] = None
    smart_tags: SmartTagPayload
    created_at: str


# ---------------------------------------------------------------------------
# In-memory store (demo — resets on cold start)
# ---------------------------------------------------------------------------
_analysis_history: list[dict] = []

# ---------------------------------------------------------------------------
# Urgent keyword detection
# ---------------------------------------------------------------------------
_URGENT_PATTERNS: list[re.Pattern[str]] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\b(anaphyla\w*)\b",
        r"\bepipen\b",
        r"\b(life[- ]?threatening)\b",
        r"\b(severe\s+allerg\w*)\b",
        r"\b(fatal\s+allerg\w*)\b",
        r"\b(allergic\s+shock)\b",
        r"\b(cannot\s+breathe)\b",
        r"\b(throat\s+swell\w*)\b",
        r"\b(emergency\s+allerg\w*)\b",
        r"\b(deadly\s+allerg\w*)\b",
        r"\b(medical\s+alert)\b",
        r"\b(celiac\s+disease)\b",
    ]
]


def _detect_urgent_keywords(text: str) -> str | None:
    for pattern in _URGENT_PATTERNS:
        match = pattern.search(text)
        if match:
            return f"Detected urgent keyword: '{match.group()}'"
    return None


# ---------------------------------------------------------------------------
# Fallback regex tagger
# ---------------------------------------------------------------------------
_FALLBACK_RULES: list[tuple[re.Pattern[str], SmartTagName]] = [
    (re.compile(r"\bvip\b", re.I), SmartTagName.VIP),
    (re.compile(r"\bceleb(rity)?\b", re.I), SmartTagName.CELEB),
    (re.compile(r"\bfrequent\b", re.I), SmartTagName.FREQUENT_VISITORS),
    (re.compile(r"\bbirthday\b", re.I), SmartTagName.BIRTHDAY),
    (re.compile(r"\banniversary\b", re.I), SmartTagName.ANNIVERSARY),
    (re.compile(r"\bno[- ]?show\b", re.I), SmartTagName.NO_SHOWS),
    (re.compile(
        r"\b(vegan|vegetarian|halal|kosher|gluten[- ]?free|pescatarian|dairy[- ]?free)\b",
        re.I,
    ), SmartTagName.DIETARY_RESTRICTIONS),
    (re.compile(
        r"\b(allerg\w+|nut[- ]?free|lactose|celiac|intoleran\w+)\b",
        re.I,
    ), SmartTagName.ALLERGIES),
]


def _fallback_tag(special_request_text: str, dietary_preferences: str) -> SmartTagPayload:
    combined = f"{special_request_text} {dietary_preferences}"
    tags: list[SmartTagName] = []
    for pattern, tag in _FALLBACK_RULES:
        if pattern.search(combined) and tag not in tags:
            tags.append(tag)

    urgent_reason = _detect_urgent_keywords(combined)
    sentiment = SentimentLevel.URGENT if urgent_reason else SentimentLevel.NEUTRAL

    if urgent_reason and SmartTagName.ALLERGIES not in tags:
        tags.append(SmartTagName.ALLERGIES)

    return SmartTagPayload(
        tags=tags,
        sentiment=sentiment,
        confidence=0.55,
        summary="Generated by deterministic fallback (Groq unavailable).",
        analyzed_at=datetime.now(timezone.utc).isoformat(),
        urgent_reason=urgent_reason,
    )


# ---------------------------------------------------------------------------
# LLM system prompt
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """\
You are a restaurant CRM tagging assistant.  Analyze the guest's special
request text and dietary preferences, then return a JSON object with EXACTLY
these fields:

{
  "tags": [],
  "sentiment": "",
  "confidence": 0.0,
  "summary": "",
  "urgent_reason": null
}

RULES:
1. "tags" must ONLY contain values from this list:
   ["VIP", "Celeb", "frequent visitors", "Birthday", "Anniversary",
    "No shows", "Dietary restrictions", "allergies"]
2. "sentiment" must be one of: "Positive", "Neutral", "Negative", "Urgent".
3. If the text mentions ANY medical condition, life-threatening allergy,
   anaphylaxis, epipen, severe allergy, or similar — you MUST set
   sentiment to "Urgent" and explain in "urgent_reason".
4. "confidence" is your confidence in the tag assignment (0.0 to 1.0).
5. "summary" is a one-sentence description of what you found.
6. Return ONLY valid JSON.  No markdown, no explanation outside the JSON.
"""


# ---------------------------------------------------------------------------
# Groq AI service
# ---------------------------------------------------------------------------
async def _analyze_with_groq(
    special_request_text: str,
    dietary_preferences: str,
) -> SmartTagPayload | None:
    """Call Groq Llama-3.  Returns None on failure (caller should use fallback)."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        logger.info("GROQ_API_KEY not set, using fallback tagger")
        return None

    try:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=api_key, timeout=30)
        model = os.environ.get("GROQ_MODEL", "llama-3.1-70b-versatile")

        user_prompt = (
            f"Special Request: {special_request_text or '(none)'}\n"
            f"Dietary Preferences: {dietary_preferences or '(none)'}"
        )

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=512,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        data = json.loads(raw)

        valid_tag_values = {t.value for t in SmartTagName}
        validated_tags = [
            SmartTagName(t) for t in data.get("tags", []) if t in valid_tag_values
        ]

        raw_sentiment = data.get("sentiment", "Neutral")
        try:
            sentiment = SentimentLevel(raw_sentiment)
        except ValueError:
            sentiment = SentimentLevel.NEUTRAL

        confidence = max(0.0, min(1.0, float(data.get("confidence", 0.5))))

        combined = f"{special_request_text} {dietary_preferences}"
        pre_urgent = _detect_urgent_keywords(combined)

        if pre_urgent and sentiment != SentimentLevel.URGENT:
            sentiment = SentimentLevel.URGENT

        urgent_reason = data.get("urgent_reason") or pre_urgent

        if sentiment == SentimentLevel.URGENT and SmartTagName.ALLERGIES not in validated_tags:
            validated_tags.append(SmartTagName.ALLERGIES)

        return SmartTagPayload(
            tags=validated_tags,
            sentiment=sentiment,
            confidence=confidence,
            summary=str(data.get("summary", ""))[:500],
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            urgent_reason=urgent_reason,
        )

    except Exception as exc:
        logger.warning("Groq API call failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "eMenu Tables — Smart Tagging API",
        "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
    }


@app.post("/api/v1/reservations/analyze-tags", response_model=AnalyzeTagsResponse)
async def analyze_tags(request: AnalyzeTagsRequest):
    # Try Groq first, fall back to regex
    result = await _analyze_with_groq(
        request.special_request_text,
        request.dietary_preferences,
    )
    if result is None:
        result = _fallback_tag(
            request.special_request_text,
            request.dietary_preferences,
        )

    notification_triggered = result.sentiment == SentimentLevel.URGENT

    if notification_triggered:
        logger.info(
            "URGENT NOTIFICATION — reservation=%s reason=%s",
            request.reservation_id,
            result.urgent_reason,
        )

    # Store in history
    entry = {
        "id": str(uuid4()),
        "reservation_id": request.reservation_id,
        "customer_name": request.customer_name,
        "smart_tags": result.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _analysis_history.insert(0, entry)
    # Keep only last 50
    if len(_analysis_history) > 50:
        _analysis_history.pop()

    return AnalyzeTagsResponse(
        reservation_id=request.reservation_id,
        tenant_id=request.tenant_id,
        customer_name=request.customer_name,
        smart_tags=result,
        notification_triggered=notification_triggered,
    )


@app.get("/api/v1/analysis-history")
async def get_analysis_history():
    return {"history": _analysis_history, "total": len(_analysis_history)}


@app.get("/api/v1/demo-scenarios")
async def get_demo_scenarios():
    """Pre-built scenarios for the frontend demo."""
    return {
        "scenarios": [
            {
                "name": "VIP Anniversary Dinner",
                "customer_name": "James & Claire Whitfield",
                "special_request_text": "This is our 25th wedding anniversary. We are VIP members. Please arrange a window table with a cake and champagne.",
                "dietary_preferences": "No specific dietary restrictions",
            },
            {
                "name": "Severe Allergy Alert",
                "customer_name": "Maria Santos",
                "special_request_text": "My daughter has a severe nut allergy and carries an epipen. Please ensure absolutely no cross-contamination. This is life-threatening.",
                "dietary_preferences": "Nut-free, dairy-free",
            },
            {
                "name": "Celebrity Birthday",
                "customer_name": "Alex Rivera",
                "special_request_text": "Birthday celebration for a celebrity guest. Need private dining area. They are a frequent visitor. Please keep it discreet.",
                "dietary_preferences": "Pescatarian, gluten-free",
            },
            {
                "name": "Simple Vegetarian Request",
                "customer_name": "Priya Sharma",
                "special_request_text": "First time visiting. Would love a quiet corner table if possible.",
                "dietary_preferences": "Vegetarian, no onion or garlic",
            },
            {
                "name": "No-Show Warning Guest",
                "customer_name": "David Chen",
                "special_request_text": "Previous no-show customer returning. Has been flagged before. Requesting specific table near the bar.",
                "dietary_preferences": "Non-vegetarian, lactose intolerant",
            },
            {
                "name": "Medical Emergency Risk",
                "customer_name": "Sarah Al-Rashidi",
                "special_request_text": "Guest has celiac disease and anaphylaxis risk with shellfish. Medical alert bracelet carrier. Emergency contact must be kept on file.",
                "dietary_preferences": "Strict gluten-free, no shellfish, halal",
            },
        ]
    }
