import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import Column, Numeric, UniqueConstraint
from sqlalchemy.dialects import postgresql
from sqlmodel import Field as SQLField
from sqlmodel import Relationship

from app.models.common import TimestampModel

if TYPE_CHECKING:
    from app.models.user import User


class CategoryEnum(str, Enum):
    ELECTRONICS = "electronics"
    CLOTHING = "clothing"
    FOOD_BEVERAGE = "food_beverage"
    HOME_GARDEN = "home_garden"
    HEALTH_BEAUTY = "health_beauty"
    SPORTS = "sports"
    TOYS = "toys"
    BOOKS = "books"
    AUTOMOTIVE = "automotive"
    OFFICE_SUPPLIES = "office_supplies"
    PET_SUPPLIES = "pet_supplies"
    JEWELLERY = "jewellery"
    FURNITURE = "furniture"


class SellerType(str, Enum):
    RETAILER = "retailer"
    WHOLESALER = "wholesaler"


class BuyerType(str, Enum):
    CUSTOMER = "customer"
    RETAILER = "retailer"


class ProductImageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    path: str
    order: int
    is_primary: bool = False


class ProductPricingBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    buyer_type: BuyerType
    price: Decimal = Field(ge=0, decimal_places=2)
    min_quantity: int = Field(default=1, ge=1)
    max_quantity: int | None = Field(default=None, ge=1)
    is_active: bool = True


class ProductPricingCreate(ProductPricingBase):
    @field_validator("max_quantity")
    @classmethod
    def validate_max_quantity(cls, v: int | None, info) -> int | None:
        if v is not None and "min_quantity" in info.data:
            if v < info.data["min_quantity"]:
                raise ValueError("max_quantity must be >= min_quantity")
        return v


class ProductPricingUpdate(BaseModel):
    price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    min_quantity: int | None = Field(default=None, ge=1)
    max_quantity: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class ProductPricing(TimestampModel, table=True):
    __tablename__ = "product_pricing"

    product_id: uuid.UUID = SQLField(
        foreign_key="product.id", nullable=False, ondelete="CASCADE"
    )
    buyer_type: BuyerType = SQLField(nullable=False)
    price: Decimal = SQLField(sa_column=Column(Numeric(10, 2), nullable=False))
    min_quantity: int = SQLField(default=1, ge=1)
    max_quantity: int | None = SQLField(default=None)
    is_active: bool = SQLField(default=True)

    product: "Product" = Relationship(back_populates="pricing_tiers")


class ProductPricingPublic(ProductPricingBase):
    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProductInventoryBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    stock_quantity: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=10, ge=0)


class ProductInventoryCreate(ProductInventoryBase):
    pass


class ProductInventoryUpdate(BaseModel):
    stock_quantity: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)


class ProductInventory(TimestampModel, table=True):
    __tablename__ = "product_inventory"

    product_id: uuid.UUID = SQLField(
        foreign_key="product.id", nullable=False, ondelete="CASCADE", unique=True
    )
    stock_quantity: int = SQLField(default=0, ge=0)
    low_stock_threshold: int = SQLField(default=10, ge=0)
    last_restocked_at: datetime | None = SQLField(default=None)

    product: "Product" = Relationship(back_populates="inventory")


class ProductInventoryPublic(ProductInventoryBase):
    id: uuid.UUID
    product_id: uuid.UUID
    last_restocked_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ProductBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None)
    category: CategoryEnum
    tags: list[str] = Field(default_factory=list)
    brand: str | None = Field(default=None, max_length=255)


class ProductCreate(ProductBase):
    sku: str | None = Field(default=None, max_length=100)
    images: list[ProductImageSchema] = Field(default_factory=list)
    pricing_tiers: list[ProductPricingCreate] = Field(min_length=1)
    initial_stock: int = Field(default=0, ge=0)
    address_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def validate_pricing_and_stock(self) -> "ProductCreate":
        """Validate that min_quantity for all pricing tiers <= initial_stock."""
        for tier in self.pricing_tiers:
            if tier.min_quantity > self.initial_stock:
                raise ValueError(
                    f"Pricing tier for {tier.buyer_type.value} has min_quantity "
                    f"{tier.min_quantity} which exceeds initial_stock {self.initial_stock}"
                )
        return self

    @model_validator(mode="after")
    def validate_retailer_pricing(self) -> "ProductCreate":
        """Ensure RETAILER bulk pricing <= CUSTOMER retail pricing."""
        customer_price = None
        retailer_price = None

        for tier in self.pricing_tiers:
            if tier.buyer_type == BuyerType.CUSTOMER:
                customer_price = tier.price
            elif tier.buyer_type == BuyerType.RETAILER:
                retailer_price = tier.price

        if customer_price is not None and retailer_price is not None:
            if retailer_price > customer_price:
                raise ValueError(
                    f"RETAILER bulk price ({retailer_price}) cannot exceed "
                    f"CUSTOMER retail price ({customer_price})"
                )
        return self


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    category: CategoryEnum | None = None
    tags: list[str] | None = None
    is_active: bool | None = None
    sku: str | None = Field(default=None, max_length=100)
    pricing_tier: ProductPricingUpdate | None = None
    brand: str | None = Field(default=None, max_length=255)
    address_id: uuid.UUID | None = None


class Product(TimestampModel, table=True):
    __table_args__ = (UniqueConstraint("seller_id", "sku", name="uq_seller_sku"),)

    name: str = SQLField(max_length=255, nullable=False)
    description: str | None = SQLField(default=None)
    category: CategoryEnum = SQLField(nullable=False)
    seller_id: uuid.UUID = SQLField(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    seller_type: SellerType = SQLField(nullable=False)
    sku: str = SQLField(max_length=100, nullable=False)
    brand: str | None = SQLField(default=None, max_length=255, index=True)
    address_id: uuid.UUID | None = SQLField(
        default=None,
        foreign_key="address.id",
        ondelete="SET NULL",
        nullable=True,
        index=True,
    )
    images: list[dict[str, Any]] = SQLField(
        default_factory=list, sa_column=Column(postgresql.JSONB)
    )
    is_active: bool = SQLField(default=True)
    tags: list[str] = SQLField(default_factory=list, sa_column=Column(postgresql.JSONB))

    seller: "User" = Relationship()
    pricing_tiers: list["ProductPricing"] = Relationship(
        back_populates="product", cascade_delete=True
    )
    inventory: "ProductInventory" = Relationship(
        back_populates="product", cascade_delete=True
    )

    def get_primary_image(self) -> str | None:
        if not self.images:
            return None
        for img in self.images:
            if img.get("is_primary"):
                return img.get("path")
        # Return first image if no primary set
        return self.images[0].get("path") if self.images else None

    def get_pricing_for_buyer(self, buyer_type: BuyerType) -> ProductPricing | None:
        """Get pricing tier for specific buyer type."""
        for tier in self.pricing_tiers:
            if tier.buyer_type == buyer_type and tier.is_active:
                return tier
        return None


class ProductPublic(ProductBase):
    id: uuid.UUID
    seller_id: uuid.UUID
    seller_type: SellerType
    sku: str
    images: list[ProductImageSchema]
    is_active: bool
    pricing_tiers: list[ProductPricingPublic] = []
    inventory: ProductInventoryPublic | None = None
    primary_image: str | None = None
    address_id: uuid.UUID | None = None
    distance_km: float | None = None
    average_rating: float | None = None
    review_count: int = 0
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_product(
        cls,
        product: Product,
        buyer_type: BuyerType | None = None,
        *,
        distance_km: float | None = None,
        average_rating: float | None = None,
        review_count: int = 0,
    ) -> "ProductPublic":
        data = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "category": product.category,
            "seller_id": product.seller_id,
            "seller_type": product.seller_type,
            "sku": product.sku,
            "images": [ProductImageSchema(**img) for img in product.images],
            "is_active": product.is_active,
            "tags": product.tags,
            "brand": product.brand,
            "pricing_tiers": [],
            "inventory": None,
            "primary_image": product.get_primary_image(),
            "address_id": product.address_id,
            "distance_km": distance_km,
            "average_rating": average_rating,
            "review_count": review_count,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
        }

        # Filter pricing tiers if buyer_type specified
        if buyer_type:
            data["pricing_tiers"] = [
                ProductPricingPublic.model_validate(tier)
                for tier in product.pricing_tiers
                if tier.buyer_type == buyer_type and tier.is_active
            ]
        else:
            data["pricing_tiers"] = [
                ProductPricingPublic.model_validate(tier)
                for tier in product.pricing_tiers
            ]

        if product.inventory:
            data["inventory"] = ProductInventoryPublic.model_validate(product.inventory)

        return cls.model_validate(data)


class ProductsPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    data: list[ProductPublic]
    count: int


class ImageReorderSchema(BaseModel):
    images: list[ProductImageSchema]
