"""Integration tests for the /v1/reservations/analyze-tags endpoint.

These tests mock the Groq API to avoid external calls and focus on the
request/response contract, validation, and notification triggering.
"""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.tagging import SentimentLevel, SmartTagName, SmartTagPayload


@pytest.fixture
def base_request():
    return {
        "reservation_id": str(uuid4()),
        "special_request_text": "Birthday dinner, window seat please",
        "dietary_preferences": "Vegetarian",
        "tenant_id": str(uuid4()),
    }


@pytest.fixture
def urgent_request():
    return {
        "reservation_id": str(uuid4()),
        "special_request_text": "Severe nut allergy, carries epipen. Anniversary celebration.",
        "dietary_preferences": "Nut-free, gluten-free",
        "tenant_id": str(uuid4()),
    }


def _mock_normal_payload() -> SmartTagPayload:
    return SmartTagPayload(
        tags=[SmartTagName.BIRTHDAY, SmartTagName.DIETARY_RESTRICTIONS],
        sentiment=SentimentLevel.POSITIVE,
        confidence=0.88,
        summary="Birthday dinner with vegetarian preference",
    )


def _mock_urgent_payload() -> SmartTagPayload:
    return SmartTagPayload(
        tags=[SmartTagName.ANNIVERSARY, SmartTagName.ALLERGIES],
        sentiment=SentimentLevel.URGENT,
        confidence=0.95,
        summary="Anniversary with severe nut allergy",
        urgent_reason="Detected urgent keyword: 'epipen'",
    )


@pytest.mark.asyncio
class TestAnalyzeTagsEndpoint:

    @patch(
        "app.api.tag_routes._tagging_service.analyze",
        new_callable=AsyncMock,
        return_value=_mock_normal_payload(),
    )
    async def test_normal_analysis_returns_200(self, mock_analyze, base_request):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/v1/reservations/analyze-tags", json=base_request)
        assert resp.status_code == 200
        data = resp.json()
        assert data["reservation_id"] == base_request["reservation_id"]
        assert data["tenant_id"] == base_request["tenant_id"]
        assert "Birthday" in data["smart_tags"]["tags"]
        assert data["smart_tags"]["sentiment"] == "Positive"
        assert data["notification_triggered"] is False

    @patch(
        "app.api.tag_routes._tagging_service.analyze",
        new_callable=AsyncMock,
        return_value=_mock_urgent_payload(),
    )
    async def test_urgent_analysis_triggers_notification(self, mock_analyze, urgent_request):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/v1/reservations/analyze-tags", json=urgent_request)
        assert resp.status_code == 200
        data = resp.json()
        assert data["smart_tags"]["sentiment"] == "Urgent"
        assert data["notification_triggered"] is True
        assert data["smart_tags"]["urgent_reason"] is not None

    async def test_missing_tenant_id_returns_422(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/v1/reservations/analyze-tags",
                json={
                    "reservation_id": str(uuid4()),
                    "special_request_text": "test",
                },
            )
        assert resp.status_code == 422

    async def test_missing_reservation_id_returns_422(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/v1/reservations/analyze-tags",
                json={
                    "tenant_id": str(uuid4()),
                    "special_request_text": "test",
                },
            )
        assert resp.status_code == 422

    @patch(
        "app.api.tag_routes._tagging_service.analyze",
        new_callable=AsyncMock,
        return_value=_mock_normal_payload(),
    )
    async def test_response_shape(self, mock_analyze, base_request):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/v1/reservations/analyze-tags", json=base_request)
        data = resp.json()
        # Verify all required top-level fields
        assert "reservation_id" in data
        assert "tenant_id" in data
        assert "smart_tags" in data
        assert "notification_triggered" in data
        # Verify smart_tags sub-fields
        st = data["smart_tags"]
        assert "tags" in st
        assert "sentiment" in st
        assert "confidence" in st
        assert "summary" in st
        assert "analyzed_at" in st


@pytest.mark.asyncio
class TestHealthEndpoint:
    async def test_health_check(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
