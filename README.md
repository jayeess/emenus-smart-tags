# eMenu Tables — Smart Tagging & Sentiment Analysis

Automated AI-powered guest tagging and sentiment analysis module for the eMenu Tables SaaS platform. Analyzes reservation special requests and dietary preferences to produce structured CRM tags, detect urgent allergy/medical alerts, and trigger staff notifications.

## Architecture

```
backend/
├── app/
│   ├── api/
│   │   └── tag_routes.py          # FastAPI endpoints
│   ├── core/
│   │   ├── config.py              # Pydantic settings (env vars)
│   │   └── database.py            # Async SQLAlchemy session factory
│   ├── models/
│   │   ├── base.py                # Base model + TenantMixin + TimestampMixin
│   │   └── customer_profile.py    # CustomerProfile with JSONB smart_tags
│   ├── schemas/
│   │   └── tagging.py             # Pydantic request/response models
│   ├── services/
│   │   ├── ai_tagging_service.py  # Groq/Llama-3 AI engine + regex fallback
│   │   ├── notification_service.py# Urgent alert dispatcher (WhatsApp/Email)
│   │   └── unit_of_work.py        # Tenant-isolated DB transaction manager
│   └── main.py                    # FastAPI app entry point
├── tests/
│   ├── test_ai_tagging_service.py
│   ├── test_schemas.py
│   └── test_tag_routes.py
├── pyproject.toml
└── .env.example
frontend/
└── src/components/
    └── SmartTagBadge.tsx           # React tag badge component
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL async connection string (`postgresql+asyncpg://...`) |
| `GROQ_API_KEY` | Yes | API key from [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | No | Groq model ID (default: `llama-3.1-70b-versatile`) |
| `GROQ_TIMEOUT` | No | Request timeout in seconds (default: `30`) |
| `GROQ_MAX_RETRIES` | No | Max retry attempts on Groq failure (default: `2`) |
| `WHATSAPP_API_URL` | No | WhatsApp Business API endpoint |
| `WHATSAPP_API_TOKEN` | No | WhatsApp bearer token |
| `EMAIL_SMTP_HOST` | No | SMTP server hostname |
| `EMAIL_SMTP_PORT` | No | SMTP port (default: `587`) |
| `EMAIL_FROM` | No | Sender email address |
| `EMAIL_USERNAME` | No | SMTP auth username |
| `EMAIL_PASSWORD` | No | SMTP auth password |
| `DEBUG` | No | Enable debug logging (default: `false`) |

## Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Configure environment
cp .env.example .env
# Edit .env with your GROQ_API_KEY and DATABASE_URL

# Run database migrations (create the table)
# In production, use Alembic. For quick setup:
python -c "
import asyncio
from app.core.database import engine
from app.models import Base
async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
asyncio.run(init())
"

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
# Copy SmartTagBadge.tsx into your React project's components directory
cp frontend/src/components/SmartTagBadge.tsx <your-project>/src/components/

# Usage in your React app:
# import SmartTagBadge from './components/SmartTagBadge';
# <SmartTagBadge smartTags={apiResponse.smart_tags} variant="card" />
```

### Run Tests

```bash
cd backend
pytest tests/ -v
```

## API Reference

### POST `/v1/reservations/analyze-tags`

Analyze reservation text and generate smart tags.

**Request Body:**
```json
{
  "reservation_id": "550e8400-e29b-41d4-a716-446655440000",
  "special_request_text": "This is our anniversary dinner. My wife has a severe nut allergy — she carries an epipen.",
  "dietary_preferences": "Vegetarian, nut-free",
  "tenant_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "customer_id": "d4e5f6a7-b8c9-0123-4567-89abcdef0123"
}
```

**Response:**
```json
{
  "reservation_id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_id": "d4e5f6a7-b8c9-0123-4567-89abcdef0123",
  "tenant_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "smart_tags": {
    "tags": ["Anniversary", "Dietary restrictions", "allergies"],
    "sentiment": "Urgent",
    "confidence": 0.95,
    "summary": "Anniversary dinner with severe nut allergy requiring epipen — immediate kitchen alert needed.",
    "analyzed_at": "2026-02-10T12:00:00Z",
    "urgent_reason": "Detected urgent keyword: 'epipen'"
  },
  "notification_triggered": true
}
```

### GET `/v1/customers/{customer_id}/tags?tenant_id=...`

Retrieve stored smart tags for a customer profile.

## CRM Tag Specification

| Tag | Category | Badge Color |
|---|---|---|
| VIP | Status | Gold |
| Celeb | Status | Gold |
| frequent visitors | Status | Gold |
| Birthday | Milestone | Blue |
| Anniversary | Milestone | Blue |
| No shows | Behavioral | Gray |
| Dietary restrictions | Health | Red |
| allergies | Health | Red |

## Multi-Tenancy

Every database query is scoped by `tenant_id` via the `DefaultUnitOfWork` pattern. The `customer_profiles` table has a composite unique index on `(tenant_id, phone)` to prevent cross-tenant data leakage while allowing the same phone number across different restaurants.
