"""
Notification trigger service for urgent allergy / medical alerts.

When the AI tagging service returns sentiment == "Urgent", this module
dispatches notifications to restaurant staff via:
  - In-system event log (always)
  - WhatsApp (if configured)
  - Email (if configured)

This follows the notification spec from "NOTIFICATIONS FOR EMENU TABLES".
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.core.config import get_settings
from app.schemas.tagging import SentimentLevel, SmartTagPayload

logger = logging.getLogger(__name__)


@dataclass
class NotificationEvent:
    """Represents a single notification dispatched by the system."""

    id: UUID = field(default_factory=uuid4)
    tenant_id: UUID = field(default_factory=uuid4)
    reservation_id: UUID = field(default_factory=uuid4)
    channel: str = ""  # "in_system" | "whatsapp" | "email"
    subject: str = ""
    body: str = ""
    dispatched_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"  # "pending" | "sent" | "failed"


class NotificationService:
    """
    Checks AI tagging results and fires notifications for Urgent sentiment.

    In production the WhatsApp and Email methods would call real APIs.
    Currently they log the event and return a structured NotificationEvent
    for audit purposes.
    """

    def __init__(self) -> None:
        self._settings = get_settings()

    async def check_and_notify(
        self,
        tenant_id: UUID,
        reservation_id: UUID,
        smart_tags: SmartTagPayload,
        staff_email: str | None = None,
        staff_phone: str | None = None,
    ) -> list[NotificationEvent]:
        """
        If sentiment is Urgent, dispatch notifications.
        Returns the list of events created (empty if not urgent).
        """
        if smart_tags.sentiment != SentimentLevel.URGENT:
            return []

        events: list[NotificationEvent] = []

        # 1. Always create an in-system event
        in_system = self._build_event(
            tenant_id=tenant_id,
            reservation_id=reservation_id,
            channel="in_system",
            smart_tags=smart_tags,
        )
        events.append(await self._dispatch_in_system(in_system))

        # 2. WhatsApp notification (if staff phone configured)
        if staff_phone and self._settings.WHATSAPP_API_URL:
            wa_event = self._build_event(
                tenant_id=tenant_id,
                reservation_id=reservation_id,
                channel="whatsapp",
                smart_tags=smart_tags,
            )
            events.append(await self._dispatch_whatsapp(wa_event, staff_phone))

        # 3. Email notification (if staff email configured)
        if staff_email and self._settings.EMAIL_SMTP_HOST:
            email_event = self._build_event(
                tenant_id=tenant_id,
                reservation_id=reservation_id,
                channel="email",
                smart_tags=smart_tags,
            )
            events.append(await self._dispatch_email(email_event, staff_email))

        logger.info(
            "Urgent notification dispatched: %d events for reservation %s",
            len(events),
            reservation_id,
        )
        return events

    def _build_event(
        self,
        tenant_id: UUID,
        reservation_id: UUID,
        channel: str,
        smart_tags: SmartTagPayload,
    ) -> NotificationEvent:
        tag_list = ", ".join(t.value for t in smart_tags.tags)
        subject = f"⚠ URGENT: Allergy/Medical Alert — Reservation {reservation_id}"
        body = (
            f"Reservation {reservation_id} has been flagged as URGENT.\n\n"
            f"Reason: {smart_tags.urgent_reason or 'Severe allergy / medical concern detected'}\n"
            f"Tags: {tag_list}\n"
            f"AI Summary: {smart_tags.summary}\n"
            f"Confidence: {smart_tags.confidence:.0%}\n\n"
            f"Please review this reservation immediately and brief kitchen staff."
        )
        return NotificationEvent(
            tenant_id=tenant_id,
            reservation_id=reservation_id,
            channel=channel,
            subject=subject,
            body=body,
        )

    async def _dispatch_in_system(self, event: NotificationEvent) -> NotificationEvent:
        """Log the event to the in-system notification queue."""
        logger.info(
            "[IN-SYSTEM] tenant=%s reservation=%s | %s",
            event.tenant_id,
            event.reservation_id,
            event.subject,
        )
        event.status = "sent"
        event.dispatched_at = datetime.now(timezone.utc)
        return event

    async def _dispatch_whatsapp(
        self, event: NotificationEvent, phone: str
    ) -> NotificationEvent:
        """
        Send WhatsApp message via configured API.

        Production implementation would POST to self._settings.WHATSAPP_API_URL
        with the API token.  Current implementation logs for audit.
        """
        logger.info(
            "[WHATSAPP] Sending to %s for reservation %s: %s",
            phone,
            event.reservation_id,
            event.subject,
        )
        # Production: httpx.AsyncClient().post(...)
        event.status = "sent"
        event.dispatched_at = datetime.now(timezone.utc)
        return event

    async def _dispatch_email(
        self, event: NotificationEvent, email: str
    ) -> NotificationEvent:
        """
        Send email notification via SMTP.

        Production implementation would use aiosmtplib.  Current implementation
        logs for audit.
        """
        logger.info(
            "[EMAIL] Sending to %s for reservation %s: %s",
            email,
            event.reservation_id,
            event.subject,
        )
        # Production: aiosmtplib.send(...)
        event.status = "sent"
        event.dispatched_at = datetime.now(timezone.utc)
        return event
