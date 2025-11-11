import uuid
from typing import TYPE_CHECKING, Optional

from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Field as SQLField
from sqlmodel import Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User


class ItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


class ItemCreate(ItemBase):
    """Payload used when creating a new item."""


class ItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


class Item(SQLModel, table=True):
    id: uuid.UUID = SQLField(default_factory=uuid.uuid4, primary_key=True)
    title: str = SQLField(min_length=1, max_length=255)
    description: str | None = SQLField(default=None, max_length=255)
    owner_id: uuid.UUID = SQLField(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: Optional["User"] = Relationship(back_populates="items")


class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ItemsPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    data: list[ItemPublic]
    count: int
