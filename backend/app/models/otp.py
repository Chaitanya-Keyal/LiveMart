import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr
from sqlmodel import Field

from app.models.common import TimestampModel


class OTPPurpose(str, Enum):
    EMAIL_VERIFICATION = "email_verification"
    LOGIN = "login"


class OTP(TimestampModel, table=True):
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    code: str = Field(max_length=6, index=True)
    purpose: OTPPurpose = Field(index=True)
    expires_at: datetime = Field(index=True)
    is_used: bool = Field(default=False, index=True)
    attempts: int = Field(default=0)


class OTPCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    email: EmailStr


class OTPVerify(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    email: EmailStr
    code: str
