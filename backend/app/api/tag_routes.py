"""
FastAPI routes for the Smart Tagging & Sentiment Analysis module.

Endpoints:
  POST /v1/reservations/analyze-tags — Run AI analysis on reservation text
  GET  /v1/customers/{customer_id}/tags — Retrieve stored smart tags
"""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.tagging import (
    AnalyzeTagsRequest,
    AnalyzeTagsResponse,
    SmartTagPayload,
)
from app.services.ai_tagging_service import TaggingService
from app.services.notification_service import NotificationService
from app.services.unit_of_work import DefaultUnitOfWork

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["Smart Tagging"])

# Service singletons (in production, use FastAPI dependency injection)
_tagging_service = TaggingService()
_notification_service = NotificationService()


@router.post(
    "/reservations/analyze-tags",
    response_model=AnalyzeTagsResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze reservation text and generate smart tags",
    description=(
        "Sends the special_request_text and dietary_preferences to Groq Llama-3, "
        "extracts CRM-spec tags, detects sentiment, and persists results. "
        "Triggers urgent notifications for medical/allergy alerts."
    ),
)
async def analyze_tags(request: AnalyzeTagsRequest) -> AnalyzeTagsResponse:
    """
    1. Call AI tagging service with the raw text.
    2. Persist tags on the customer profile (if customer_id provided).
    3. Trigger notifications if sentiment is Urgent.
    4. Return the full analysis payload.
    """
    # Step 1: AI analysis
    try:
        smart_tags: SmartTagPayload = await _tagging_service.analyze(
            special_request_text=request.special_request_text,
            dietary_preferences=request.dietary_preferences,
        )
    except Exception as exc:
        logger.exception("Unexpected error during AI analysis")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI analysis failed: {exc}",
        ) from exc

    # Step 2: Persist to DB if customer_id is known
    customer_id = request.customer_id
    if customer_id:
        try:
            async with DefaultUnitOfWork(request.tenant_id) as uow:
                profile = await uow.get_customer(customer_id)
                if profile is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=(
                            f"Customer {customer_id} not found "
                            f"for tenant {request.tenant_id}"
                        ),
                    )
                await uow.update_smart_tags(customer_id, smart_tags)
                await uow.commit()
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Failed to persist smart tags")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {exc}",
            ) from exc

    # Step 3: Trigger urgent notifications
    notification_triggered = False
    try:
        events = await _notification_service.check_and_notify(
            tenant_id=request.tenant_id,
            reservation_id=request.reservation_id,
            smart_tags=smart_tags,
        )
        notification_triggered = len(events) > 0
    except Exception:
        logger.exception("Notification dispatch failed (non-blocking)")

    return AnalyzeTagsResponse(
        reservation_id=request.reservation_id,
        customer_id=customer_id,
        tenant_id=request.tenant_id,
        smart_tags=smart_tags,
        notification_triggered=notification_triggered,
    )


@router.get(
    "/customers/{customer_id}/tags",
    response_model=SmartTagPayload | None,
    summary="Retrieve stored smart tags for a customer",
)
async def get_customer_tags(
    customer_id: UUID,
    tenant_id: UUID,
) -> SmartTagPayload | None:
    """
    Look up the persisted smart_tags JSONB column for a given customer,
    scoped to the provided tenant_id.
    """
    async with DefaultUnitOfWork(tenant_id) as uow:
        profile = await uow.get_customer(customer_id)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer {customer_id} not found for tenant {tenant_id}",
            )
        if profile.smart_tags is None:
            return None
        return SmartTagPayload(**profile.smart_tags)
