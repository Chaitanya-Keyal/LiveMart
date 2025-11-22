import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column, Numeric
from sqlalchemy.dialects import postgresql
from sqlmodel import Field as SQLField
from sqlmodel import Relationship

from app.models.common import TimestampModel

if TYPE_CHECKING:
    from app.models.user import User


class SettlementStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"


class UserType(str, Enum):
    SELLER = "seller"
    DELIVERY_PARTNER = "delivery_partner"


class PaymentSettlementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: uuid.UUID
    user_type: UserType
    amount: Decimal = Field(ge=0, decimal_places=2)
    commission_amount: Decimal = Field(ge=0, decimal_places=2)
    net_amount: Decimal = Field(ge=0, decimal_places=2)
    settlement_date: datetime
    status: SettlementStatus
    notes: str | None = None


class PaymentSettlementCreate(BaseModel):
    user_id: uuid.UUID
    order_ids: list[uuid.UUID] = Field(min_length=1)
    notes: str | None = Field(default=None, max_length=1024)


class PaymentSettlementUpdate(BaseModel):
    status: SettlementStatus | None = None
    notes: str | None = Field(default=None, max_length=1024)


class PaymentSettlement(TimestampModel, table=True):
    user_id: uuid.UUID = SQLField(foreign_key="user.id", ondelete="CASCADE", index=True)
    user_type: UserType = SQLField(index=True)
    amount: Decimal = SQLField(sa_column=Column(Numeric(10, 2), nullable=False))
    commission_amount: Decimal = SQLField(
        sa_column=Column(Numeric(10, 2), nullable=False)
    )
    net_amount: Decimal = SQLField(sa_column=Column(Numeric(10, 2), nullable=False))
    settlement_date: datetime = SQLField(index=True)
    status: SettlementStatus = SQLField(default=SettlementStatus.PENDING, index=True)
    notes: str | None = SQLField(default=None, max_length=1024)
    order_ids: list[str] = SQLField(sa_column=Column(postgresql.JSONB, nullable=False))

    user: "User" = Relationship()


class PaymentSettlementPublic(PaymentSettlementBase):
    id: uuid.UUID
    order_ids: list[str]
    created_at: datetime
    updated_at: datetime


class PaymentSettlementsPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    data: list[PaymentSettlementPublic]
    count: int


class PendingSettlement(BaseModel):
    """Aggregated pending settlement data for a user."""

    model_config = ConfigDict(from_attributes=True)
    user_id: uuid.UUID
    user_name: str | None = None
    user_email: str
    user_type: UserType
    order_count: int
    total_amount: Decimal = Field(ge=0, decimal_places=2)
    commission_amount: Decimal = Field(ge=0, decimal_places=2)
    net_amount: Decimal = Field(ge=0, decimal_places=2)
    order_ids: list[uuid.UUID]


class SettlementSummary(BaseModel):
    """Summary statistics for settlements."""

    total_platform_commission: Decimal = Field(ge=0, decimal_places=2)
    total_pending_payouts: Decimal = Field(ge=0, decimal_places=2)
    pending_settlement_count: int
