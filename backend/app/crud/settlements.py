import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.order import Order, OrderStatus
from app.models.role import RoleEnum
from app.models.settlement import (
    PaymentSettlement,
    PaymentSettlementCreate,
    PendingSettlement,
    SettlementStatus,
    SettlementSummary,
    UserType,
)
from app.models.user import User

COMMISSION_RATE = Decimal("0.05")  # 5% platform commission


def get_pending_settlements_by_user(
    *, session: Session
) -> tuple[list[PendingSettlement], SettlementSummary]:
    """
    Get pending settlements aggregated by user.
    Merges all pending orders for each user (both as seller and delivery partner).
    """
    user_settlements: dict[uuid.UUID, dict] = {}

    # Get sellers with pending settlements
    seller_stmt = (
        select(
            Order.seller_id,
            func.count(Order.id).label("order_count"),
            func.sum(Order.original_subtotal).label("total_amount"),
        )
        .where(
            Order.deleted_at.is_(None),
            Order.settlement_id.is_(None),
            Order.order_status.in_([OrderStatus.CONFIRMED, OrderStatus.DELIVERED]),
        )
        .group_by(Order.seller_id)
    )

    seller_results = session.exec(seller_stmt).all()

    for seller_id, order_count, total_amount in seller_results:
        if total_amount is None or total_amount <= 0:
            continue

        user = session.get(User, seller_id)
        if not user:
            continue

        # Get order IDs
        order_ids_stmt = select(Order.id).where(
            Order.seller_id == seller_id,
            Order.deleted_at.is_(None),
            Order.settlement_id.is_(None),
            Order.order_status.in_([OrderStatus.CONFIRMED, OrderStatus.DELIVERED]),
        )
        order_ids = list(session.exec(order_ids_stmt).all())

        if seller_id not in user_settlements:
            user_settlements[seller_id] = {
                "user": user,
                "total_amount": Decimal("0"),
                "order_count": 0,
                "order_ids": [],
            }

        user_settlements[seller_id]["total_amount"] += Decimal(str(total_amount))
        user_settlements[seller_id]["order_count"] += order_count
        user_settlements[seller_id]["order_ids"].extend(order_ids)

    # Get delivery partners with pending settlements
    dp_stmt = (
        select(
            Order.delivery_partner_id,
            func.count(Order.id).label("order_count"),
            func.sum(Order.delivery_fee).label("total_amount"),
        )
        .where(
            Order.deleted_at.is_(None),
            Order.settlement_id.is_(None),
            Order.delivery_partner_id.isnot(None),
            Order.order_status == OrderStatus.DELIVERED,
        )
        .group_by(Order.delivery_partner_id)
    )

    dp_results = session.exec(dp_stmt).all()

    for dp_id, order_count, total_amount in dp_results:
        if total_amount is None or total_amount <= 0:
            continue

        user = session.get(User, dp_id)
        if not user:
            continue

        # Get order IDs
        order_ids_stmt = select(Order.id).where(
            Order.delivery_partner_id == dp_id,
            Order.deleted_at.is_(None),
            Order.settlement_id.is_(None),
            Order.order_status == OrderStatus.DELIVERED,
        )
        order_ids = list(session.exec(order_ids_stmt).all())

        if dp_id not in user_settlements:
            user_settlements[dp_id] = {
                "user": user,
                "total_amount": Decimal("0"),
                "order_count": 0,
                "order_ids": [],
            }

        user_settlements[dp_id]["total_amount"] += Decimal(str(total_amount))
        user_settlements[dp_id]["order_count"] += order_count
        user_settlements[dp_id]["order_ids"].extend(order_ids)

    # Build pending settlements list
    pending_settlements = []
    for user_id, data in user_settlements.items():
        total_amount = data["total_amount"].quantize(Decimal("0.01"))
        commission = (total_amount * COMMISSION_RATE).quantize(Decimal("0.01"))
        net_amount = (total_amount - commission).quantize(Decimal("0.01"))

        unique_order_ids = list(set(data["order_ids"]))

        # Determine primary user type based on roles
        user_type = UserType.SELLER
        if data["user"].has_role(RoleEnum.DELIVERY_PARTNER):
            user_type = UserType.DELIVERY_PARTNER
        if data["user"].has_role(RoleEnum.RETAILER) or data["user"].has_role(
            RoleEnum.WHOLESALER
        ):
            user_type = UserType.SELLER

        pending_settlements.append(
            PendingSettlement(
                user_id=user_id,
                user_name=data["user"].full_name,
                user_email=data["user"].email,
                user_type=user_type,
                order_count=len(unique_order_ids),
                total_amount=total_amount,
                commission_amount=commission,
                net_amount=net_amount,
                order_ids=unique_order_ids,
            )
        )

    # Calculate summary
    total_commission = sum(
        (ps.commission_amount for ps in pending_settlements), start=Decimal("0")
    )
    total_pending = sum(
        (ps.net_amount for ps in pending_settlements), start=Decimal("0")
    )

    summary = SettlementSummary(
        total_platform_commission=total_commission,
        total_pending_payouts=total_pending,
        pending_settlement_count=len(pending_settlements),
    )

    return pending_settlements, summary


def create_settlement(
    *, session: Session, settlement_in: PaymentSettlementCreate
) -> PaymentSettlement:
    """
    Create a settlement for a user.
    Validates that all orders belong to the user (either as seller or delivery partner) and are unsettled.
    """
    user = session.get(User, settlement_in.user_id)
    if not user:
        raise ValueError("User not found")

    # Determine primary user type based on roles
    user_type = UserType.SELLER
    if user.has_role(RoleEnum.DELIVERY_PARTNER):
        user_type = UserType.DELIVERY_PARTNER
    if user.has_role(RoleEnum.RETAILER) or user.has_role(RoleEnum.WHOLESALER):
        user_type = UserType.SELLER

    # Validate and calculate settlement
    orders = []
    total_amount = Decimal("0")

    for order_id in settlement_in.order_ids:
        order = session.get(Order, order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")

        if order.settlement_id is not None:
            raise ValueError(f"Order {order_id} is already settled")

        # Check if order belongs to user as seller
        if order.seller_id == settlement_in.user_id:
            if order.order_status not in [OrderStatus.CONFIRMED, OrderStatus.DELIVERED]:
                raise ValueError(
                    f"Order {order_id} is not in a settleable status (must be CONFIRMED or DELIVERED)"
                )
            total_amount += order.original_subtotal
            orders.append(order)
        # Check if order belongs to user as delivery partner
        elif order.delivery_partner_id == settlement_in.user_id:
            if order.order_status != OrderStatus.DELIVERED:
                raise ValueError(
                    f"Order {order_id} is not delivered (required for delivery partner settlement)"
                )
            total_amount += order.delivery_fee
            orders.append(order)
        else:
            raise ValueError(
                f"Order {order_id} does not belong to this user (neither as seller nor delivery partner)"
            )

    if len(orders) == 0:
        raise ValueError("No valid orders to settle")

    # Calculate commission
    commission = (total_amount * COMMISSION_RATE).quantize(Decimal("0.01"))
    net_amount = (total_amount - commission).quantize(Decimal("0.01"))

    # Create settlement
    settlement = PaymentSettlement(
        user_id=settlement_in.user_id,
        user_type=user_type,
        amount=total_amount.quantize(Decimal("0.01")),
        commission_amount=commission,
        net_amount=net_amount,
        settlement_date=datetime.utcnow(),
        status=SettlementStatus.COMPLETED,
        notes=settlement_in.notes,
        order_ids=[str(oid) for oid in settlement_in.order_ids],
    )
    session.add(settlement)
    session.flush()

    # Link orders to settlement
    for order in orders:
        order.settlement_id = settlement.id
        session.add(order)

    session.commit()
    session.refresh(settlement)
    return settlement


def get_settlement_by_id(
    *, session: Session, settlement_id: uuid.UUID
) -> tuple[PaymentSettlement, list[Order]] | None:
    """Get a settlement by ID with all associated orders."""
    settlement = session.get(PaymentSettlement, settlement_id)
    if not settlement or settlement.deleted_at is not None:
        return None

    # Get orders
    order_uuids = [uuid.UUID(oid) for oid in settlement.order_ids]
    orders = []
    for oid in order_uuids:
        order = session.get(Order, oid)
        if order:
            orders.append(order)

    return settlement, orders


def get_settlement_history(
    *,
    session: Session,
    user_id: uuid.UUID | None = None,
    status: SettlementStatus | None = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[PaymentSettlement], int]:
    """Get settlement history with optional filters."""
    stmt = select(PaymentSettlement).where(PaymentSettlement.deleted_at.is_(None))

    if user_id:
        stmt = stmt.where(PaymentSettlement.user_id == user_id)

    if status:
        stmt = stmt.where(PaymentSettlement.status == status)

    stmt = (
        stmt.order_by(PaymentSettlement.settlement_date.desc())
        .offset(skip)
        .limit(limit)
    )

    settlements = session.exec(stmt).all()
    count = session.exec(
        select(func.count())
        .select_from(PaymentSettlement)
        .where(PaymentSettlement.deleted_at.is_(None))
    ).one()

    return list(settlements), count
