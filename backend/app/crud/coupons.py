import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.coupon import (
    Coupon,
    CouponCreate,
    CouponUpdate,
    DiscountType,
)
from app.models.user import User


def create_coupon(*, session: Session, coupon_in: CouponCreate) -> Coupon:
    """Create a new coupon."""
    # Check if code already exists
    existing = session.exec(select(Coupon).where(Coupon.code == coupon_in.code)).first()
    if existing and existing.deleted_at is None:
        raise ValueError(f"Coupon code '{coupon_in.code}' already exists")

    coupon = Coupon(
        code=coupon_in.code.upper(),  # Normalize to uppercase
        discount_type=coupon_in.discount_type,
        discount_value=coupon_in.discount_value,
        min_order_value=coupon_in.min_order_value,
        max_discount=coupon_in.max_discount,
        usage_limit=coupon_in.usage_limit,
        valid_from=coupon_in.valid_from,
        valid_until=coupon_in.valid_until,
        is_active=coupon_in.is_active,
        is_featured=coupon_in.is_featured,
        target_emails=coupon_in.target_emails,
    )
    session.add(coupon)
    session.commit()
    session.refresh(coupon)
    return coupon


def get_coupons(
    *, session: Session, skip: int = 0, limit: int = 100
) -> tuple[list[Coupon], int]:
    """Get all coupons with pagination."""
    stmt = (
        select(Coupon)
        .where(Coupon.deleted_at.is_(None))
        .order_by(Coupon.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    coupons = session.exec(stmt).all()
    count = session.exec(
        select(func.count()).select_from(Coupon).where(Coupon.deleted_at.is_(None))
    ).one()
    return list(coupons), count


def get_coupon_by_id(*, session: Session, coupon_id: uuid.UUID) -> Coupon | None:
    """Get a coupon by ID."""
    return session.exec(
        select(Coupon).where(Coupon.id == coupon_id, Coupon.deleted_at.is_(None))
    ).first()


def get_coupon_by_code(*, session: Session, code: str) -> Coupon | None:
    """Get a coupon by code."""
    return session.exec(
        select(Coupon).where(Coupon.code == code.upper(), Coupon.deleted_at.is_(None))
    ).first()


def update_coupon(
    *, session: Session, coupon: Coupon, coupon_in: CouponUpdate
) -> Coupon:
    """Update a coupon."""
    update_data = coupon_in.model_dump(exclude_unset=True)

    # Check code uniqueness if being changed
    if "code" in update_data and update_data["code"] != coupon.code:
        existing = session.exec(
            select(Coupon).where(Coupon.code == update_data["code"].upper())
        ).first()
        if existing and existing.id != coupon.id and existing.deleted_at is None:
            raise ValueError(f"Coupon code '{update_data['code']}' already exists")
        update_data["code"] = update_data["code"].upper()

    for key, value in update_data.items():
        setattr(coupon, key, value)

    session.add(coupon)
    session.commit()
    session.refresh(coupon)
    return coupon


def delete_coupon(*, session: Session, coupon: Coupon) -> None:
    """Soft delete a coupon."""
    coupon.deleted_at = datetime.utcnow()
    session.add(coupon)
    session.commit()


def validate_coupon(
    *, session: Session, code: str, cart_total: Decimal, user_email: str
) -> tuple[bool, Decimal, str | None]:
    """
    Validate a coupon and calculate discount.
    Returns (valid, discount_amount, message).
    """
    coupon = get_coupon_by_code(session=session, code=code)

    if not coupon:
        return False, Decimal("0"), "Coupon code not found"

    if not coupon.is_active:
        return False, Decimal("0"), "Coupon is not active"

    now = datetime.utcnow()
    if now < coupon.valid_from:
        return False, Decimal("0"), "Coupon is not yet valid"

    if now > coupon.valid_until:
        return False, Decimal("0"), "Coupon has expired"

    if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
        return False, Decimal("0"), "Coupon usage limit reached"

    # Check target emails if specified
    if coupon.target_emails is not None and user_email not in coupon.target_emails:
        return False, Decimal("0"), "This coupon is not available for your account"

    # Check minimum order value
    if coupon.min_order_value is not None and cart_total < coupon.min_order_value:
        return (
            False,
            Decimal("0"),
            f"Minimum order value of ₹{coupon.min_order_value} required",
        )

    # Calculate discount
    if coupon.discount_type == DiscountType.FIXED:
        discount = min(coupon.discount_value, cart_total)
    else:  # PERCENTAGE
        discount = (cart_total * coupon.discount_value) / Decimal("100")
        if coupon.max_discount is not None:
            discount = min(discount, coupon.max_discount)

    discount = discount.quantize(Decimal("0.01"))
    return True, discount, "Coupon is valid"


def increment_coupon_usage(*, session: Session, coupon: Coupon) -> None:
    """Increment the usage count of a coupon."""
    coupon.used_count += 1
    session.add(coupon)
    session.commit()


def get_featured_coupons(*, session: Session, limit: int = 5) -> list[Coupon]:
    """
    Get featured coupons that are currently valid.
    Sorted by highest discount value descending.
    """
    now = datetime.utcnow()

    # Calculate effective discount value for sorting
    # For fixed: use discount_value
    # For percentage: use max_discount if set, else use discount_value * 1000 as heuristic
    stmt = (
        select(Coupon)
        .where(
            Coupon.deleted_at.is_(None),
            Coupon.is_active.is_(True),
            Coupon.is_featured.is_(True),
            Coupon.valid_from <= now,
            Coupon.valid_until >= now,
        )
        .order_by(Coupon.discount_value.desc())
        .limit(limit)
    )

    coupons = session.exec(stmt).all()

    # Sort by effective discount value
    def sort_key(c: Coupon) -> Decimal:
        if c.discount_type == DiscountType.FIXED:
            return c.discount_value
        else:  # PERCENTAGE
            if c.max_discount is not None:
                return c.max_discount
            # Heuristic: percentage * 10 (e.g., 20% = 200)
            return c.discount_value * Decimal("10")

    return sorted(coupons, key=sort_key, reverse=True)[:limit]


def get_all_user_emails(*, session: Session) -> list[str]:
    """Get all active user emails for bulk notifications."""
    stmt = select(User.email).where(User.is_active.is_(True), User.deleted_at.is_(None))
    emails = session.exec(stmt).all()
    return list(emails)
