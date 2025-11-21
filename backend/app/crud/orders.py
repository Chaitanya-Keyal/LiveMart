from __future__ import annotations

import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import joinedload, selectinload
from sqlmodel import Session, select

from app.models.address import Address
from app.models.order import (
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    Payment,
)
from app.models.product import BuyerType, Product, ProductInventory, SellerType
from app.models.role import RoleEnum
from app.models.user import User
from app.utils.location import haversine_km
from app.utils.razorpay import amount_rupees_to_paise, create_razorpay_order

BASE_DELIVERY_FEE = Decimal("10")
PER_KM_FEE = Decimal("1")


def _buyer_type_for_user(user: User) -> BuyerType:
    if user.active_role == RoleEnum.RETAILER:
        return BuyerType.RETAILER
    # default to CUSTOMER for any other role
    return BuyerType.CUSTOMER


def _get_pickup_coords_for_product(
    session: Session, product: Product
) -> tuple[float | None, float | None, uuid.UUID | None]:
    """Return (lat, lon, pickup_address_id) for product's address or seller's active address."""
    if product.address_id:
        addr = session.get(Address, product.address_id)
        if addr:
            return float(addr.latitude), float(addr.longitude), addr.id
    # fallback to seller active address
    seller = session.get(User, product.seller_id)
    if seller and seller.active_address_id:
        addr = session.get(Address, seller.active_address_id)
        if addr:
            return float(addr.latitude), float(addr.longitude), addr.id
    return None, None, None


def _address_snapshot(addr: Address) -> dict:
    return {
        "id": str(addr.id),
        "street_address": addr.street_address,
        "apartment_suite": addr.apartment_suite,
        "city": addr.city,
        "state": addr.state,
        "postal_code": addr.postal_code,
        "country": addr.country,
        "latitude": float(addr.latitude),
        "longitude": float(addr.longitude),
        "label": addr.label.value if hasattr(addr.label, "value") else str(addr.label),
        "custom_label": addr.custom_label,
    }


def create_orders_from_cart(
    *, session: Session, user: User, delivery_address_id: uuid.UUID
) -> list[Order]:
    """Create orders grouped by (seller_id, pickup_address_id) from user's cart.

    Applies delivery fee: 10 + 1 per km, capped at 50% of order subtotal.
    Decrements inventory with SELECT FOR UPDATE to avoid race conditions.
    """

    # Load cart items
    from app.models.order import Cart, CartItem

    cart = session.exec(select(Cart).where(Cart.user_id == user.id)).first()
    if not cart or not cart.items:
        raise ValueError("Cart is empty")

    buyer_type = _buyer_type_for_user(user)

    # Destination address
    delivery_addr = session.get(Address, delivery_address_id)
    if not delivery_addr or delivery_addr.user_id != user.id:
        raise ValueError("Invalid delivery address")
    delivery_lat, delivery_lon = (
        float(delivery_addr.latitude),
        float(delivery_addr.longitude),
    )

    # Group items by (seller_id, pickup_address_id)
    groups: dict[tuple[uuid.UUID, uuid.UUID | None], list[CartItem]] = defaultdict(list)
    for it in cart.items:
        product = session.get(Product, it.product_id)
        if not product or not product.is_active or product.deleted_at is not None:
            raise ValueError("Product not available in cart")

        # Enforce allowed purchase mapping
        if (
            product.seller_type == SellerType.RETAILER
            and buyer_type != BuyerType.CUSTOMER
        ):
            raise ValueError("Retail products can be purchased only by customers")
        if (
            product.seller_type == SellerType.WHOLESALER
            and buyer_type != BuyerType.RETAILER
        ):
            raise ValueError("Wholesale products can be purchased only by retailers")

        _, _, pickup_addr_id = _get_pickup_coords_for_product(session, product)
        groups[(product.seller_id, pickup_addr_id)].append(it)

    created_orders: list[Order] = []

    for (seller_id, pickup_addr_id), items in groups.items():
        order_number = Order.generate_order_number()
        order_items: list[OrderItem] = []
        order_subtotal = Decimal("0")

        # Determine pickup coords once per group
        lat, lon, _ = (None, None, None)
        if pickup_addr_id:
            pick_addr = session.get(Address, pickup_addr_id)
            if pick_addr:
                lat, lon = float(pick_addr.latitude), float(pick_addr.longitude)
        if lat is None or lon is None:
            # fallback via product-by-product if missing
            # If all missing, distance=0 (no fee growth)
            lat, lon = None, None

        # Build items and lock inventory rows
        for it in items:
            product = session.get(Product, it.product_id)
            inv_stmt = (
                select(ProductInventory)
                .where(ProductInventory.product_id == product.id)
                .with_for_update()
            )
            inventory = session.exec(inv_stmt).first()
            if not inventory or inventory.stock_quantity < it.quantity:
                raise ValueError("Insufficient stock for one or more items")

            tier = product.get_pricing_for_buyer(buyer_type)
            if not tier or not tier.is_active:
                raise ValueError("Pricing not available for buyer type")

            price = Decimal(str(tier.price))
            line_total = price * it.quantity
            order_subtotal += line_total

            order_items.append(
                OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    sku=product.sku,
                    price_paid=price,
                    quantity=it.quantity,
                    image_path=product.get_primary_image(),
                )
            )

        # Calculate delivery fee using group-level pickup coords; if missing, fee=base only
        if lat is not None and lon is not None:
            distance_km = Decimal(
                str(haversine_km(lat, lon, delivery_lat, delivery_lon))
            )
        else:
            distance_km = Decimal("0")
        raw_fee = BASE_DELIVERY_FEE + (PER_KM_FEE * distance_km)
        cap = order_subtotal * Decimal("0.5")
        delivery_fee = raw_fee if raw_fee <= cap else cap

        order_total = order_subtotal + delivery_fee

        order = Order(
            order_number=order_number,
            buyer_id=user.id,
            seller_id=seller_id,
            pickup_address_id=pickup_addr_id,
            order_status=OrderStatus.PENDING,
            buyer_type=buyer_type,
            delivery_fee=delivery_fee.quantize(Decimal("0.01")),
            order_subtotal=order_subtotal.quantize(Decimal("0.01")),
            order_total=order_total.quantize(Decimal("0.01")),
            pickup_address_snapshot=(
                _address_snapshot(session.get(Address, pickup_addr_id))
                if pickup_addr_id
                else None
            ),
            delivery_address_snapshot=_address_snapshot(delivery_addr),
        )
        session.add(order)
        session.flush()

        for oi in order_items:
            oi.order_id = order.id
            session.add(oi)

        # Decrement inventory (after successful aggregation)
        for it in items:
            inv = session.exec(
                select(ProductInventory)
                .where(ProductInventory.product_id == it.product_id)
                .with_for_update()
            ).first()
            inv.stock_quantity -= it.quantity
            session.add(inv)

        created_orders.append(order)

    session.commit()
    # Do not clear cart here; caller should clear after payment creation
    # But we do want fresh state on orders
    for o in created_orders:
        session.refresh(o)
    return created_orders


def create_unified_payment_for_orders(
    *, session: Session, user: User, orders: list[Order]
) -> Payment:
    total_amount = sum((o.order_total for o in orders), start=Decimal("0"))
    amount_paise = amount_rupees_to_paise(total_amount)

    rp = create_razorpay_order(amount_paise=amount_paise, currency="INR")
    payment = Payment(
        buyer_id=user.id,
        status="pending",
        total_amount=total_amount.quantize(Decimal("0.01")),
        currency="INR",
        razorpay_order_id=rp.get("id"),
    )
    session.add(payment)
    session.flush()

    for o in orders:
        o.payment_id = payment.id
        o.payment_amount = o.order_total
        session.add(o)

    session.commit()
    session.refresh(payment)
    return payment


def get_orders_for_buyer(
    *,
    session: Session,
    user_id: uuid.UUID,
    buyer_type: BuyerType | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Order], int]:
    stmt = (
        select(Order)
        .where(Order.buyer_id == user_id)
        .where(Order.deleted_at.is_(None))
        .options(
            joinedload(Order.buyer),
            joinedload(Order.seller),
            joinedload(Order.delivery_partner),
            selectinload(Order.items),
            selectinload(Order.history),
        )
    )
    if buyer_type is not None:
        stmt = stmt.where(Order.buyer_type == buyer_type)
    stmt = stmt.order_by(Order.created_at.desc()).offset(skip).limit(limit)
    orders = session.exec(stmt).unique().all()
    count = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    return list(orders), count


def get_orders_for_seller(
    *,
    session: Session,
    seller_id: uuid.UUID,
    buyer_type: BuyerType | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Order], int]:
    stmt = (
        select(Order)
        .where(Order.seller_id == seller_id)
        .where(Order.deleted_at.is_(None))
        .options(
            joinedload(Order.buyer),
            joinedload(Order.seller),
            joinedload(Order.delivery_partner),
            selectinload(Order.items),
            selectinload(Order.history),
        )
    )
    if buyer_type is not None:
        stmt = stmt.where(Order.buyer_type == buyer_type)
    stmt = stmt.order_by(Order.created_at.desc()).offset(skip).limit(limit)
    orders = session.exec(stmt).unique().all()
    count = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    return list(orders), count


def get_orders_for_delivery_partner(
    *, session: Session, delivery_partner_id: uuid.UUID, skip: int = 0, limit: int = 50
) -> tuple[list[Order], int]:
    stmt = (
        select(Order)
        .where(Order.delivery_partner_id == delivery_partner_id)
        .where(Order.deleted_at.is_(None))
        .options(
            joinedload(Order.buyer),
            joinedload(Order.seller),
            joinedload(Order.delivery_partner),
            selectinload(Order.items),
            selectinload(Order.history),
        )
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    orders = session.exec(stmt).unique().all()
    count = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    return list(orders), count


def get_order_by_id(*, session: Session, order_id: uuid.UUID) -> Order | None:
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            joinedload(Order.buyer),
            joinedload(Order.seller),
            joinedload(Order.delivery_partner),
            selectinload(Order.items),
            selectinload(Order.history),
        )
    )
    return session.exec(stmt).first()


def update_order_status(
    *,
    session: Session,
    order: Order,
    new_status: OrderStatus,
    updated_by: uuid.UUID,
    notes: str | None = None,
) -> Order:
    # NOTE: Simple validation; detailed state machine can be extended
    order.order_status = new_status
    session.add(order)
    session.add(
        OrderStatusHistory(
            order_id=order.id, status=new_status, updated_by_id=updated_by, notes=notes
        )
    )
    session.commit()
    session.refresh(order)
    return order


def get_available_delivery_orders(
    *,
    session: Session,
    origin_lat: float,
    origin_lon: float,
    skip: int = 0,
    limit: int = 50,
):
    # Orders ready to ship and unclaimed
    stmt = (
        select(Order)
        .where(Order.order_status == OrderStatus.READY_TO_SHIP)
        .where(Order.delivery_partner_id.is_(None))
        .options(
            joinedload(Order.buyer),
            joinedload(Order.seller),
            # delivery_partner is None here, so no need to join
            selectinload(Order.items),
            selectinload(Order.history),
        )
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = session.exec(stmt).unique().all()
    # For simplicity, compute distances in Python
    results = []
    for order in rows:
        pick = order.pickup_address_snapshot or {}
        drop = order.delivery_address_snapshot or {}
        pickup_distance = None
        journey_distance = None
        try:
            plat, plon = float(pick.get("latitude")), float(pick.get("longitude"))
            pickup_distance = haversine_km(origin_lat, origin_lon, plat, plon)
            dlat, dlon = float(drop.get("latitude")), float(drop.get("longitude"))
            journey_distance = haversine_km(plat, plon, dlat, dlon)
        except Exception:
            pass
        results.append((order, pickup_distance, journey_distance))
    return results
