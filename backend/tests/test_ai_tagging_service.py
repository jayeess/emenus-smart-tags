"""Tests for the AI tagging service — focuses on fallback logic and urgent detection."""

import pytest

from app.schemas.tagging import SentimentLevel, SmartTagName
from app.services.ai_tagging_service import (
    TaggingService,
    _detect_urgent_keywords,
    _fallback_tag,
)


class TestUrgentKeywordDetection:
    def test_anaphylaxis_detected(self):
        result = _detect_urgent_keywords("Patient has anaphylaxis risk")
        assert result is not None
        assert "anaphyla" in result.lower()

    def test_epipen_detected(self):
        result = _detect_urgent_keywords("She carries an EpiPen at all times")
        assert result is not None

    def test_severe_allergy_detected(self):
        result = _detect_urgent_keywords("He has a severe allergy to shellfish")
        assert result is not None

    def test_life_threatening_detected(self):
        result = _detect_urgent_keywords("life-threatening peanut reaction")
        assert result is not None

    def test_celiac_disease_detected(self):
        result = _detect_urgent_keywords("Diagnosed with celiac disease")
        assert result is not None

    def test_normal_text_not_flagged(self):
        result = _detect_urgent_keywords("Window seat preferred, birthday dinner")
        assert result is None

    def test_simple_allergy_not_flagged_as_urgent(self):
        # "allergic" alone without severity modifiers should not trigger urgent
        result = _detect_urgent_keywords("I'm lactose intolerant")
        assert result is None

    def test_empty_text(self):
        result = _detect_urgent_keywords("")
        assert result is None


class TestFallbackTagger:
    def test_birthday_tag(self):
        result = _fallback_tag("It's my birthday!", "")
        assert SmartTagName.BIRTHDAY in result.tags
        assert result.sentiment == SentimentLevel.NEUTRAL

    def test_anniversary_and_vegan(self):
        result = _fallback_tag("Anniversary dinner", "Vegan")
        assert SmartTagName.ANNIVERSARY in result.tags
        assert SmartTagName.DIETARY_RESTRICTIONS in result.tags

    def test_allergy_detection(self):
        result = _fallback_tag("Nut allergy, please be careful", "Gluten-free")
        assert SmartTagName.ALLERGIES in result.tags
        assert SmartTagName.DIETARY_RESTRICTIONS in result.tags

    def test_vip_and_celeb(self):
        result = _fallback_tag("VIP guest, celebrity arrival", "")
        assert SmartTagName.VIP in result.tags
        assert SmartTagName.CELEB in result.tags

    def test_no_show_tag(self):
        result = _fallback_tag("Previous no-show customer", "")
        assert SmartTagName.NO_SHOWS in result.tags

    def test_frequent_visitor(self):
        result = _fallback_tag("frequent visitor, knows the chef", "")
        assert SmartTagName.FREQUENT_VISITORS in result.tags

    def test_urgent_fallback(self):
        result = _fallback_tag("Severe allergy to nuts, carries epipen", "")
        assert result.sentiment == SentimentLevel.URGENT
        assert result.urgent_reason is not None
        assert SmartTagName.ALLERGIES in result.tags

    def test_empty_input(self):
        result = _fallback_tag("", "")
        assert result.tags == []
        assert result.sentiment == SentimentLevel.NEUTRAL
        assert result.confidence == 0.55

    def test_multiple_dietary_tags(self):
        result = _fallback_tag("", "Vegetarian, lactose intolerant, kosher")
        assert SmartTagName.DIETARY_RESTRICTIONS in result.tags
        assert SmartTagName.ALLERGIES in result.tags

    def test_no_duplicate_tags(self):
        result = _fallback_tag("allergy allergy allergy", "nut-free")
        tag_counts = {}
        for t in result.tags:
            tag_counts[t] = tag_counts.get(t, 0) + 1
        for count in tag_counts.values():
            assert count == 1


class TestTaggingServiceInit:
    """Test that the service can be instantiated (doesn't call Groq)."""

    def test_service_instantiation(self):
        service = TaggingService()
        assert service._model is not None
        assert service._max_retries >= 0
