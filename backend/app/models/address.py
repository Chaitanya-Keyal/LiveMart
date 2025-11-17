import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import Column, Numeric
from sqlmodel import Field as SQLField
from sqlmodel import Relationship

from app.models.common import TimestampModel

if TYPE_CHECKING:
    from app.models.user import User

COORDINATE_PRECISION = 6


def _round_coordinate(value: float | Decimal) -> float:
    return round(float(value), COORDINATE_PRECISION)


class AddressLabelEnum(str, enum.Enum):
    HOME = "home"
    WORK = "work"
    OTHER = "other"
    CUSTOM = "custom"


class AddressBase(BaseModel):
    street_address: str = Field(max_length=255)
    apartment_suite: str | None = Field(default=None, max_length=255)
    city: str = Field(max_length=128)
    state: str = Field(max_length=128)
    postal_code: str = Field(max_length=64)
    country: str = Field(max_length=128)
    label: AddressLabelEnum = AddressLabelEnum.HOME
    custom_label: str | None = Field(default=None, max_length=255)
    latitude: float
    longitude: float
    additional_notes: str | None = Field(default=None, max_length=512)

    @field_validator("latitude", "longitude")
    @classmethod
    def validate_coordinate(cls, value: float) -> float:
        return _round_coordinate(value)

    @model_validator(mode="after")
    def ensure_custom_label(self) -> "AddressBase":
        if self.label == AddressLabelEnum.CUSTOM and not self.custom_label:
            msg = "custom_label is required when label is custom"
            raise ValueError(msg)
        if self.label != AddressLabelEnum.CUSTOM:
            self.custom_label = None
        return self


class AddressCreate(AddressBase):
    pass


class AddressUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    street_address: str | None = Field(default=None, max_length=255)
    apartment_suite: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=128)
    state: str | None = Field(default=None, max_length=128)
    postal_code: str | None = Field(default=None, max_length=64)
    country: str | None = Field(default=None, max_length=128)
    label: AddressLabelEnum | None = None
    custom_label: str | None = Field(default=None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    additional_notes: str | None = Field(default=None, max_length=512)

    @field_validator("latitude", "longitude")
    @classmethod
    def validate_optional_coordinate(cls, value: float | None) -> float | None:
        if value is None:
            return None
        return _round_coordinate(value)

    @model_validator(mode="after")
    def handle_custom_label(self) -> "AddressUpdate":
        if self.label == AddressLabelEnum.CUSTOM and not self.custom_label:
            msg = "custom_label is required when label is custom"
            raise ValueError(msg)
        if self.label and self.label != AddressLabelEnum.CUSTOM:
            self.custom_label = None
        return self


class AddressPublic(AddressBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool = False
    created_at: datetime
    updated_at: datetime


class Address(TimestampModel, table=True):
    user_id: uuid.UUID = SQLField(foreign_key="user.id", ondelete="CASCADE", index=True)
    street_address: str = SQLField(max_length=255)
    apartment_suite: str | None = SQLField(default=None, max_length=255)
    city: str = SQLField(max_length=128)
    state: str = SQLField(max_length=128)
    postal_code: str = SQLField(max_length=64)
    country: str = SQLField(max_length=128)
    label: AddressLabelEnum = SQLField(default=AddressLabelEnum.HOME, index=True)
    custom_label: str | None = SQLField(default=None, max_length=255)
    latitude: Decimal = SQLField(sa_column=Column(Numeric(9, 6), nullable=False))
    longitude: Decimal = SQLField(sa_column=Column(Numeric(9, 6), nullable=False))
    additional_notes: str | None = SQLField(default=None, max_length=512)

    user: "User" = Relationship(
        back_populates="addresses",
        sa_relationship_kwargs={"foreign_keys": "[Address.user_id]"},
    )
