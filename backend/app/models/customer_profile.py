"""
SQLAlchemy model for the CustomerProfile table.

The `smart_tags` JSONB column stores AI-generated tags produced by the
Smart Tagging & Sentiment Analysis module.  Its shape follows:

    {
        "tags": ["VIP", "Dietary restrictions", ...],
        "sentiment": "Positive" | "Neutral" | "Negative" | "Urgent",
        "confidence": 0.0-1.0,
        "summary": "Brief AI-generated note",
        "analyzed_at": "ISO-8601 timestamp"
    }
"""

import uuid

from sqlalchemy import Column, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.models.base import Base, TenantMixin, TimestampMixin


class CustomerProfile(Base, TenantMixin, TimestampMixin):
    __tablename__ = "customer_profiles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # --- Basic information ---
    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=False, index=True)

    # --- Dietary / preferences (raw text captured at reservation time) ---
    dietary_preferences = Column(Text, nullable=True)
    special_request_text = Column(Text, nullable=True)

    # --- Staff-assigned manual tags (e.g. "Regular") ---
    manual_tags = Column(
        JSONB,
        nullable=False,
        server_default="[]",
        comment="Staff-assigned tags list",
    )

    # --- AI-generated smart tags (populated by the tagging service) ---
    smart_tags = Column(
        JSONB,
        nullable=True,
        comment="AI-generated tags, sentiment, and confidence payload",
    )

    # --- Staff and customer notes ---
    customer_notes = Column(Text, nullable=True)
    staff_notes = Column(Text, nullable=True)

    __table_args__ = (
        Index(
            "ix_customer_profiles_tenant_phone",
            "tenant_id",
            "phone",
            unique=True,
        ),
        Index(
            "ix_customer_profiles_smart_tags",
            "smart_tags",
            postgresql_using="gin",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<CustomerProfile id={self.id} "
            f"name={self.first_name} {self.last_name} "
            f"tenant={self.tenant_id}>"
        )
