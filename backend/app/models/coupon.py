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
    from app.models.order import Payment


class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class CouponBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str = Field(max_length=50)
    discount_type: DiscountType
    discount_value: Decimal = Field(ge=0, decimal_places=2)
    min_order_value: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    max_discount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    usage_limit: int | None = Field(default=None, ge=1)
    valid_from: datetime
    valid_until: datetime
    is_active: bool = True
    is_featured: bool = False
    target_emails: list[str] | None = None


class CouponCreate(BaseModel):
    code: str = Field(max_length=50)
    discount_type: DiscountType
    discount_value: Decimal = Field(ge=0, decimal_places=2)
    min_order_value: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    max_discount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    usage_limit: int | None = Field(default=None, ge=1)
    valid_from: datetime
    valid_until: datetime
    is_active: bool = True
    is_featured: bool = False
    target_emails: list[str] | None = None
    send_notification: bool = False


class CouponUpdate(BaseModel):
    code: str | None = Field(default=None, max_length=50)
    discount_type: DiscountType | None = None
    discount_value: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    min_order_value: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    max_discount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    usage_limit: int | None = Field(default=None, ge=1)
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    target_emails: list[str] | None = None


class Coupon(TimestampModel, table=True):
    code: str = SQLField(unique=True, index=True, max_length=50)
    discount_type: DiscountType = SQLField()
    discount_value: Decimal = SQLField(sa_column=Column(Numeric(10, 2), nullable=False))
    min_order_value: Decimal | None = SQLField(
        default=None, sa_column=Column(Numeric(10, 2))
    )
    max_discount: Decimal | None = SQLField(
        default=None, sa_column=Column(Numeric(10, 2))
    )
    usage_limit: int | None = SQLField(default=None)
    used_count: int = SQLField(default=0)
    valid_from: datetime = SQLField()
    valid_until: datetime = SQLField()
    is_active: bool = SQLField(default=True, index=True)
    is_featured: bool = SQLField(default=False, index=True)
    target_emails: list[str] | None = SQLField(
        default=None, sa_column=Column(postgresql.JSONB)
    )


class CouponPublic(CouponBase):
    id: uuid.UUID
    used_count: int
    created_at: datetime
    updated_at: datetime


class CouponsPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    data: list[CouponPublic]
    count: int


class CouponValidateRequest(BaseModel):
    code: str = Field(max_length=50)
    cart_total: Decimal = Field(ge=0, decimal_places=2)


class CouponValidateResponse(BaseModel):
    valid: bool
    discount_amount: Decimal = Field(ge=0, decimal_places=2)
    message: str | None = None


class PaymentCoupon(TimestampModel, table=True):
    payment_id: uuid.UUID = SQLField(
        foreign_key="payment.id", ondelete="CASCADE", index=True
    )
    coupon_id: uuid.UUID = SQLField(
        foreign_key="coupon.id", ondelete="CASCADE", index=True
    )
    discount_amount: Decimal = SQLField(
        sa_column=Column(Numeric(10, 2), nullable=False)
    )

    payment: "Payment" = Relationship()
    coupon: "Coupon" = Relationship()


class PaymentCouponPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    payment_id: uuid.UUID
    coupon_id: uuid.UUID
    discount_amount: Decimal
    created_at: datetime
