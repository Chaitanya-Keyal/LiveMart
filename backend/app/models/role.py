import enum
import uuid
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship

from app.models.common import TimestampModel

if TYPE_CHECKING:
    from app.models.user import User


class RoleEnum(str, enum.Enum):
    """Available user roles in the system."""

    ADMIN = "admin"
    CUSTOMER = "customer"
    RETAILER = "retailer"
    WHOLESALER = "wholesaler"
    DELIVERY_PARTNER = "delivery_partner"


class UserRole(TimestampModel, table=True):
    """Many-to-many relationship between users and roles."""

    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    role: RoleEnum

    user: "User" = Relationship(back_populates="user_roles")
