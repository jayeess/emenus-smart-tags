"""
Unit of Work pattern with mandatory tenant isolation.

Every database operation goes through `DefaultUnitOfWork`, which:
  1. Opens an async session scoped to a single request.
  2. Applies a tenant_id filter to every query automatically.
  3. Commits or rolls back as a single transaction.
"""

import logging
from types import TracebackType
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.models.customer_profile import CustomerProfile
from app.schemas.tagging import SmartTagPayload

logger = logging.getLogger(__name__)


class DefaultUnitOfWork:
    """
    Async context manager that scopes every DB operation to a single tenant.

    Usage:
        async with DefaultUnitOfWork(tenant_id) as uow:
            profile = await uow.get_customer(customer_id)
            await uow.update_smart_tags(customer_id, payload)
            await uow.commit()
    """

    def __init__(self, tenant_id: UUID) -> None:
        self._tenant_id = tenant_id
        self._session: AsyncSession | None = None

    async def __aenter__(self) -> "DefaultUnitOfWork":
        self._session = async_session_factory()
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        if self._session is None:
            return
        try:
            if exc_type is not None:
                await self._session.rollback()
        finally:
            await self._session.close()
            self._session = None

    @property
    def session(self) -> AsyncSession:
        if self._session is None:
            raise RuntimeError("UnitOfWork is not active. Use 'async with' context.")
        return self._session

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()

    # ── Customer Profile operations (tenant-scoped) ───────────────────────

    async def get_customer(self, customer_id: UUID) -> CustomerProfile | None:
        """Fetch a customer profile, scoped to the current tenant."""
        stmt = (
            select(CustomerProfile)
            .where(
                CustomerProfile.id == customer_id,
                CustomerProfile.tenant_id == self._tenant_id,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_customer_by_phone(self, phone: str) -> CustomerProfile | None:
        """Lookup by phone number within the tenant."""
        stmt = (
            select(CustomerProfile)
            .where(
                CustomerProfile.phone == phone,
                CustomerProfile.tenant_id == self._tenant_id,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_smart_tags(
        self,
        customer_id: UUID,
        payload: SmartTagPayload,
    ) -> None:
        """Persist AI-generated smart tags on a customer profile."""
        stmt = (
            update(CustomerProfile)
            .where(
                CustomerProfile.id == customer_id,
                CustomerProfile.tenant_id == self._tenant_id,
            )
            .values(smart_tags=payload.model_dump(mode="json"))
        )
        result = await self.session.execute(stmt)
        if result.rowcount == 0:
            logger.warning(
                "update_smart_tags affected 0 rows: customer_id=%s tenant_id=%s",
                customer_id,
                self._tenant_id,
            )

    async def create_customer(
        self,
        first_name: str,
        last_name: str,
        phone: str,
        email: str | None = None,
        dietary_preferences: str | None = None,
        special_request_text: str | None = None,
        smart_tags: SmartTagPayload | None = None,
    ) -> CustomerProfile:
        """Create a new customer profile bound to the current tenant."""
        profile = CustomerProfile(
            tenant_id=self._tenant_id,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            email=email,
            dietary_preferences=dietary_preferences,
            special_request_text=special_request_text,
            smart_tags=smart_tags.model_dump(mode="json") if smart_tags else None,
        )
        self.session.add(profile)
        await self.session.flush()
        return profile
