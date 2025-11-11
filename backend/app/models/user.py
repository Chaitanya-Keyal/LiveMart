import uuid
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlmodel import Field as SQLField
from sqlmodel import Relationship, SQLModel

if TYPE_CHECKING:
    from .item import Item


class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    email: EmailStr = Field(max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class User(SQLModel, table=True):
    id: uuid.UUID = SQLField(default_factory=uuid.uuid4, primary_key=True)
    email: str = SQLField(unique=True, index=True, max_length=255)
    hashed_password: str = SQLField(max_length=128)
    is_active: bool = SQLField(default=True)
    is_superuser: bool = SQLField(default=False)
    full_name: str | None = SQLField(default=None, max_length=255)
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)


class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    data: list[UserPublic]
    count: int
