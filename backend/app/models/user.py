import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import ForeignKey
from sqlmodel import Field as SQLField
from sqlmodel import Relationship

from app.models.common import TimestampModel
from app.models.role import RoleEnum

if TYPE_CHECKING:
    from app.models.address import Address
    from app.models.role import UserRole


class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    email: EmailStr = Field(max_length=255)
    is_active: bool = True
    full_name: str | None = Field(default=None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    roles: list[RoleEnum] = Field(default_factory=lambda: [RoleEnum.CUSTOMER])


class UserRegister(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    roles: list[RoleEnum] = Field(
        default_factory=lambda: [RoleEnum.CUSTOMER], min_length=1
    )


class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class User(TimestampModel, table=True):
    email: str = SQLField(unique=True, index=True, max_length=255)
    hashed_password: str = SQLField(max_length=128)
    is_active: bool = SQLField(default=True)
    full_name: str | None = SQLField(default=None, max_length=255)
    active_role: RoleEnum | None = SQLField(default=None)
    active_address_id: uuid.UUID | None = SQLField(
        default=None,
        sa_column=ForeignKey(
            "address.id",
            use_alter=True,
            name="fk_user_active_address_id",
            nullable=True,
            ondelete="SET NULL",
        ),
    )
    email_verified: bool = SQLField(default=False)

    user_roles: list["UserRole"] = Relationship(
        back_populates="user", cascade_delete=True
    )
    addresses: list["Address"] = Relationship(
        back_populates="user",
        cascade_delete=True,
        sa_relationship_kwargs={"foreign_keys": "[Address.user_id]"},
    )

    def has_role(self, role: RoleEnum) -> bool:
        """Check if user has a specific role."""
        return any(ur.role == role for ur in self.user_roles)

    def get_roles(self) -> list[RoleEnum]:
        """Get all roles for this user."""
        return [ur.role for ur in self.user_roles]

    def has_address(self, address_id: uuid.UUID) -> bool:
        """Check if the user owns the provided address."""
        return any(address.id == address_id for address in self.addresses)

    def get_addresses(self) -> list["Address"]:
        """Return all addresses belonging to the user."""
        return list(self.addresses)

    def get_active_address(self) -> "Address | None":
        """Return whichever address is currently marked active."""
        for address in self.addresses:
            if address.id == self.active_address_id:
                return address
        return None


class UserPublic(UserBase):
    id: uuid.UUID
    roles: list[RoleEnum] = []
    active_role: RoleEnum | None = None
    active_address_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class UserPublicWithToken(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user: UserPublic
    access_token: str
    token_type: str = "bearer"


class UsersPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    data: list[UserPublic]
    count: int


class RoleSwitch(BaseModel):
    """Request to switch active role."""

    role: RoleEnum


class RoleAdd(BaseModel):
    """Request to add a role to user."""

    role: RoleEnum


class RoleRemove(BaseModel):
    """Request to remove a role from user."""

    role: RoleEnum
