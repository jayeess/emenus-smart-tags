"""Tests for Pydantic schemas."""

from datetime import datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.tagging import (
    AnalyzeTagsRequest,
    AnalyzeTagsResponse,
    SentimentLevel,
    SmartTagName,
    SmartTagPayload,
)


class TestSmartTagPayload:
    def test_defaults(self):
        payload = SmartTagPayload()
        assert payload.tags == []
        assert payload.sentiment == SentimentLevel.NEUTRAL
        assert payload.confidence == 0.0
        assert payload.summary == ""
        assert payload.urgent_reason is None

    def test_full_payload(self):
        payload = SmartTagPayload(
            tags=[SmartTagName.VIP, SmartTagName.BIRTHDAY, SmartTagName.ALLERGIES],
            sentiment=SentimentLevel.URGENT,
            confidence=0.92,
            summary="VIP guest birthday with severe allergy",
            urgent_reason="Severe nut allergy detected",
        )
        assert len(payload.tags) == 3
        assert payload.sentiment == SentimentLevel.URGENT
        assert payload.confidence == 0.92
        assert payload.urgent_reason is not None

    def test_confidence_clamping_rejects_out_of_range(self):
        with pytest.raises(ValidationError):
            SmartTagPayload(confidence=1.5)
        with pytest.raises(ValidationError):
            SmartTagPayload(confidence=-0.1)

    def test_json_round_trip(self):
        payload = SmartTagPayload(
            tags=[SmartTagName.CELEB, SmartTagName.DIETARY_RESTRICTIONS],
            sentiment=SentimentLevel.POSITIVE,
            confidence=0.85,
            summary="Celebrity guest, vegetarian",
        )
        json_str = payload.model_dump_json()
        restored = SmartTagPayload.model_validate_json(json_str)
        assert restored.tags == payload.tags
        assert restored.sentiment == payload.sentiment

    def test_invalid_tag_name_rejected(self):
        with pytest.raises(ValidationError):
            SmartTagPayload(tags=["InvalidTag"])


class TestAnalyzeTagsRequest:
    def test_valid_request(self):
        req = AnalyzeTagsRequest(
            reservation_id=uuid4(),
            special_request_text="It's my birthday!",
            dietary_preferences="Vegan",
            tenant_id=uuid4(),
        )
        assert req.customer_id is None
        assert req.special_request_text == "It's my birthday!"

    def test_tenant_id_required(self):
        with pytest.raises(ValidationError):
            AnalyzeTagsRequest(
                reservation_id=uuid4(),
                special_request_text="test",
            )

    def test_max_length_enforcement(self):
        with pytest.raises(ValidationError):
            AnalyzeTagsRequest(
                reservation_id=uuid4(),
                special_request_text="x" * 2001,
                dietary_preferences="",
                tenant_id=uuid4(),
            )


class TestAnalyzeTagsResponse:
    def test_response_construction(self):
        resp = AnalyzeTagsResponse(
            reservation_id=uuid4(),
            tenant_id=uuid4(),
            smart_tags=SmartTagPayload(
                tags=[SmartTagName.VIP],
                sentiment=SentimentLevel.POSITIVE,
                confidence=0.8,
            ),
            notification_triggered=False,
        )
        assert resp.customer_id is None
        assert resp.notification_triggered is False
        assert resp.smart_tags.tags == [SmartTagName.VIP]
