import secrets
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import Column, Numeric, UniqueConstraint
from sqlalchemy.dialects import postgresql
from sqlmodel import Field as SQLField
from sqlmodel import Relationship

from app.models.common import TimestampModel
from app.models.product import BuyerType

if TYPE_CHECKING:
    from app.models.address import Address
    from app.models.product import Product
    from app.models.user import User


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY_TO_SHIP = "ready_to_ship"
    DELIVERY_PARTNER_ASSIGNED = "delivery_partner_assigned"
    PICKED_UP = "picked_up"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"
    REFUNDED = "refunded"


class Cart(TimestampModel, table=True):
    user_id: uuid.UUID = SQLField(foreign_key="user.id", ondelete="CASCADE", index=True)

    user: "User" = Relationship()
    items: list["CartItem"] = Relationship(back_populates="cart", cascade_delete=True)


class CartItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: uuid.UUID
    quantity: int = Field(ge=1)


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartItem(TimestampModel, table=True):
    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", name="uq_cart_product"),
    )

    cart_id: uuid.UUID = SQLField(foreign_key="cart.id", ondelete="CASCADE", index=True)
    product_id: uuid.UUID = SQLField(
        foreign_key="product.id", ondelete="CASCADE", index=True
    )
    quantity: int = SQLField(default=1, ge=1)

    cart: "Cart" = Relationship(back_populates="items")
    product: "Product" = Relationship()


class CartItemPublic(CartItemBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CartPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    items: list[CartItemPublic] = []
    created_at: datetime
    updated_at: datetime


class OrderItemSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: uuid.UUID
    product_name: str
    sku: str | None = None
    image_path: str | None = None


class OrderItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: uuid.UUID
    product_name: str
    sku: str | None = None
    price_paid: Decimal = Field(ge=0, decimal_places=2)
    quantity: int = Field(ge=1)
    image_path: str | None = None


class OrderItem(TimestampModel, table=True):
    order_id: uuid.UUID = SQLField(
        foreign_key="order.id", ondelete="CASCADE", index=True
    )
    product_id: uuid.UUID = SQLField(
        foreign_key="product.id", ondelete="SET NULL", nullable=True
    )
    product_name: str = SQLField(max_length=255)
    sku: str | None = SQLField(default=None, max_length=100)
    price_paid: Decimal = SQLField(sa_column=Column(Numeric(10, 2), nullable=False))
    quantity: int = SQLField(ge=1)
    image_path: str | None = SQLField(default=None, max_length=512)

    order: "Order" = Relationship(back_populates="items")
    product: "Product" = Relationship()


class OrderItemPublic(OrderItemBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class OrderBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    order_number: str
    buyer_id: uuid.UUID
    seller_id: uuid.UUID
    pickup_address_id: uuid.UUID | None = None
    order_status: OrderStatus
    buyer_type: BuyerType
    delivery_partner_id: uuid.UUID | None = None
    delivery_fee: Decimal = Field(ge=0, decimal_places=2)
    order_subtotal: Decimal = Field(ge=0, decimal_places=2)
    order_total: Decimal = Field(ge=0, decimal_places=2)
    payment_id: uuid.UUID | None = None
    payment_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    pickup_address_snapshot: dict | None = None
    delivery_address_snapshot: dict | None = None


class OrderCreate(BaseModel):
    pass


class Order(TimestampModel, table=True):
    __table_args__ = (UniqueConstraint("order_number", name="uq_order_number"),)

    order_number: str = SQLField(max_length=40, index=True)
    buyer_id: uuid.UUID = SQLField(
        foreign_key="user.id", ondelete="CASCADE", index=True
    )
    seller_id: uuid.UUID = SQLField(
        foreign_key="user.id", ondelete="CASCADE", index=True
    )
    pickup_address_id: uuid.UUID | None = SQLField(
        default=None, foreign_key="address.id", ondelete="SET NULL", index=True
    )
    order_status: OrderStatus = SQLField(default=OrderStatus.PENDING, index=True)
    buyer_type: BuyerType = SQLField()
    delivery_partner_id: uuid.UUID | None = SQLField(
        default=None, foreign_key="user.id", ondelete="SET NULL", index=True
    )
    delivery_fee: Decimal = SQLField(sa_column=Column(Numeric(10, 2), nullable=False))
    order_subtotal: Decimal = SQLField(sa_column=Column(Numeric(10, 2), nullable=False))
    order_total: Decimal = SQLField(sa_column=Column(Numeric(10, 2), nullable=False))
    payment_id: uuid.UUID | None = SQLField(
        default=None, foreign_key="payment.id", ondelete="SET NULL", index=True
    )
    payment_amount: Decimal | None = SQLField(sa_column=Column(Numeric(10, 2)))
    pickup_address_snapshot: dict | None = SQLField(
        default=None, sa_column=Column(postgresql.JSONB)
    )
    delivery_address_snapshot: dict | None = SQLField(
        default=None, sa_column=Column(postgresql.JSONB)
    )

    buyer: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Order.buyer_id]"}
    )
    seller: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Order.seller_id]"}
    )
    delivery_partner: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Order.delivery_partner_id]"}
    )
    pickup_address: "Address" = Relationship()
    items: list["OrderItem"] = Relationship(back_populates="order", cascade_delete=True)
    payment: "Payment" = Relationship(back_populates="orders")
    history: list["OrderStatusHistory"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"order_by": "OrderStatusHistory.created_at.desc()"},
    )

    @staticmethod
    def generate_order_number() -> str:
        return f"ORD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(3).upper()}"


class OrderStatusHistoryPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: OrderStatus
    updated_by_id: uuid.UUID | None = None
    notes: str | None = None
    created_at: datetime


class OrderActionHints(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    next_status: OrderStatus | None = None
    next_status_label: str | None = None
    can_cancel: bool = False
    cancel_disabled_reason: str | None = None


class ContactInfo(BaseModel):
    """Contact information for buyer/seller/delivery partner"""

    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str | None = None
    email: str


class OrderPublic(OrderBase):
    id: uuid.UUID
    items: list[OrderItemPublic] = []
    history: list[OrderStatusHistoryPublic] = []
    created_at: datetime
    updated_at: datetime
    action_hints: OrderActionHints | None = None
    buyer_contact: ContactInfo | None = None
    seller_contact: ContactInfo | None = None
    delivery_partner_contact: ContactInfo | None = None


class OrdersPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    data: list[OrderPublic]
    count: int


class OrderStatusHistory(TimestampModel, table=True):
    order_id: uuid.UUID = SQLField(
        foreign_key="order.id", ondelete="CASCADE", index=True
    )
    status: OrderStatus
    updated_by_id: uuid.UUID = SQLField(
        foreign_key="user.id", ondelete="SET NULL", nullable=True
    )
    notes: str | None = SQLField(default=None, max_length=1024)

    order: "Order" = Relationship(back_populates="history")
    updated_by: "User" = Relationship()


class PaymentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    buyer_id: uuid.UUID
    status: PaymentStatus
    total_amount: Decimal = Field(ge=0, decimal_places=2)
    currency: str = Field(default="INR", min_length=1, max_length=8)
    razorpay_order_id: str | None = None
    razorpay_payment_id: str | None = None


class Payment(TimestampModel, table=True):
    buyer_id: uuid.UUID = SQLField(
        foreign_key="user.id", ondelete="CASCADE", index=True
    )
    status: PaymentStatus = SQLField(default=PaymentStatus.PENDING, index=True)
    total_amount: Decimal = SQLField(sa_column=Column(Numeric(10, 2), nullable=False))
    currency: str = SQLField(default="INR", max_length=8)
    razorpay_order_id: str | None = SQLField(default=None, index=True, max_length=64)
    razorpay_payment_id: str | None = SQLField(default=None, index=True, max_length=64)

    buyer: "User" = Relationship()
    orders: list["Order"] = Relationship(back_populates="payment")


class PaymentPublic(PaymentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CheckoutRequest(BaseModel):
    delivery_address_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def ensure_address(self) -> "CheckoutRequest":
        # Final check happens in route with user.active_address
        return self


class CheckoutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    payment: PaymentPublic
    orders: list[OrderPublic]
