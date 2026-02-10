"""Pydantic schemas for the Smart Tagging & Sentiment Analysis API."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SentimentLevel(str, Enum):
    POSITIVE = "Positive"
    NEUTRAL = "Neutral"
    NEGATIVE = "Negative"
    URGENT = "Urgent"


class SmartTagName(str, Enum):
    """Allowed tag names from the CRM specification."""
    VIP = "VIP"
    CELEB = "Celeb"
    FREQUENT_VISITORS = "frequent visitors"
    BIRTHDAY = "Birthday"
    ANNIVERSARY = "Anniversary"
    NO_SHOWS = "No shows"
    DIETARY_RESTRICTIONS = "Dietary restrictions"
    ALLERGIES = "allergies"


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class AnalyzeTagsRequest(BaseModel):
    """Payload sent to POST /v1/reservations/analyze-tags."""

    reservation_id: UUID = Field(
        ...,
        description="Unique identifier of the reservation being analyzed",
    )
    special_request_text: str = Field(
        default="",
        max_length=2000,
        description="Free-text special requests from the customer",
    )
    dietary_preferences: str = Field(
        default="",
        max_length=1000,
        description="Dietary preferences string (e.g. 'Vegan, nut allergy')",
    )
    tenant_id: UUID = Field(
        ...,
        description="Restaurant/tenant identifier (multi-tenancy key)",
    )
    customer_id: Optional[UUID] = Field(
        default=None,
        description="Optional existing customer profile to update",
    )


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class SmartTagPayload(BaseModel):
    """The JSONB payload persisted in customer_profiles.smart_tags."""

    tags: list[SmartTagName] = Field(
        default_factory=list,
        description="List of AI-inferred CRM tags",
    )
    sentiment: SentimentLevel = Field(
        default=SentimentLevel.NEUTRAL,
        description="Overall sentiment of the request text",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Model confidence score (0-1)",
    )
    summary: str = Field(
        default="",
        max_length=500,
        description="Brief AI-generated summary of the analysis",
    )
    analyzed_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="ISO-8601 timestamp of when analysis was performed",
    )
    urgent_reason: Optional[str] = Field(
        default=None,
        max_length=300,
        description="Explanation when sentiment is Urgent (allergy/medical)",
    )


class AnalyzeTagsResponse(BaseModel):
    """Response returned by POST /v1/reservations/analyze-tags."""

    reservation_id: UUID
    customer_id: Optional[UUID] = None
    tenant_id: UUID
    smart_tags: SmartTagPayload
    notification_triggered: bool = Field(
        default=False,
        description="Whether an urgent notification was dispatched",
    )

    model_config = {"from_attributes": True}
