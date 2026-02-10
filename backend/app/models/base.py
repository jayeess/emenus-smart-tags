import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


class TenantMixin:
    """Mixin that enforces multi-tenancy via tenant_id on every row."""

    tenant_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="Restaurant/tenant identifier for data isolation",
    )


class TimestampMixin:
    """Mixin for created_at / updated_at audit columns."""

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
