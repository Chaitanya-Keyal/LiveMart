import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Field as SQLField
from sqlmodel import Relationship

from app.models.common import TimestampModel

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.user import User


class ProductReview(TimestampModel, table=True):
    """Product review from verified purchasers"""

    __tablename__ = "productreview"

    product_id: uuid.UUID = SQLField(
        foreign_key="product.id", ondelete="CASCADE", index=True
    )
    author_user_id: uuid.UUID = SQLField(
        foreign_key="user.id", ondelete="CASCADE", index=True
    )
    rating: int = SQLField(ge=1, le=5)
    title: str = SQLField(max_length=255)
    content: str = SQLField(max_length=2000)

    product: "Product" = Relationship()
    author: "User" = Relationship()


class ReviewBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    rating: int = Field(ge=1, le=5)
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=2000)


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = Field(default=None, min_length=1, max_length=2000)


class ReviewPublic(ReviewBase):
    id: uuid.UUID
    product_id: uuid.UUID
    author_user_id: uuid.UUID
    author_name: str | None = None
    created_at: datetime
    updated_at: datetime


class ReviewsPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    data: list[ReviewPublic]
    count: int
