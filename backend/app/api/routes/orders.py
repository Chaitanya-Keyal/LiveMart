import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import object_session

from app import crud
from app.api.deps import CurrentUser, SessionDep, require_role
from app.models.order import (
    CheckoutRequest,
    CheckoutResponse,
    ContactInfo,
    OrderActionHints,
    OrderPublic,
    OrdersPublic,
    OrderStatus,
    PaymentPublic,
)
from app.models.product import BuyerType
from app.models.role import RoleEnum
from app.models.user import User
from app.utils.email import (
    generate_delivery_claimed_email,
    generate_order_status_update_email,
    send_email,
)

router = APIRouter(prefix="/orders", tags=["orders"])

SELLER_FLOW = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY_TO_SHIP,
]

DELIVERY_FLOW = [
    OrderStatus.DELIVERY_PARTNER_ASSIGNED,
    OrderStatus.PICKED_UP,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
]

CANCEL_ALLOWED_STATUSES = {
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
}

FORBIDDEN_TARGETS = {OrderStatus.RETURNED, OrderStatus.REFUNDED}


def _next_in_flow(current: OrderStatus, flow: list[OrderStatus]) -> OrderStatus | None:
    try:
        idx = flow.index(current)
    except ValueError:
        return None
    if idx == len(flow) - 1:
        return None
    return flow[idx + 1]


def get_order_action_hints(order, user) -> OrderActionHints | None:
    if order.order_status in {OrderStatus.CANCELLED, OrderStatus.DELIVERED}:
        return None

    is_seller = (user.id == order.seller_id) and (
        user.active_role in [RoleEnum.RETAILER, RoleEnum.WHOLESALER]
    )
    delivery_partner_id = order.delivery_partner_id or uuid.UUID(int=0)
    is_dp = (user.id == delivery_partner_id) and (
        user.active_role == RoleEnum.DELIVERY_PARTNER
    )

    if not (is_seller or is_dp):
        return None

    hints = OrderActionHints()
    seller_flow_status = order.order_status in SELLER_FLOW
    delivery_flow_status = order.order_status in DELIVERY_FLOW
    applied = False

    if is_seller and seller_flow_status:
        hints.next_status = _next_in_flow(order.order_status, SELLER_FLOW)
        hints.can_cancel = order.order_status in CANCEL_ALLOWED_STATUSES
        applied = True

    if not applied and is_dp and delivery_flow_status:
        hints.next_status = _next_in_flow(order.order_status, DELIVERY_FLOW)
        hints.can_cancel = False
        applied = True

    if not applied or (not hints.next_status and not hints.can_cancel):
        return None

    if hints.next_status:
        hints.next_status_label = hints.next_status.value.replace("_", " ").title()

    return hints


def serialize_order(order, current_user: CurrentUser | None = None) -> OrderPublic:
    payload = OrderPublic.model_validate(order)

    # Add contact information
    if order.buyer:
        payload.buyer_contact = ContactInfo(
            id=order.buyer.id, full_name=order.buyer.full_name, email=order.buyer.email
        )

    if order.seller:
        payload.seller_contact = ContactInfo(
            id=order.seller.id,
            full_name=order.seller.full_name,
            email=order.seller.email,
        )

    # Add delivery partner contact if assigned
    if order.delivery_partner_id:
        session = object_session(order)
        if session:
            dp = session.get(User, order.delivery_partner_id)
            if dp:
                payload.delivery_partner_contact = ContactInfo(
                    id=dp.id, full_name=dp.full_name, email=dp.email
                )

    if current_user is not None:
        hints = get_order_action_hints(order, current_user)
        if hints:
            payload.action_hints = hints
    return payload


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    *, session: SessionDep, current_user: CurrentUser, body: CheckoutRequest
) -> Any:
    delivery_address_id = body.delivery_address_id or current_user.active_address_id
    if not delivery_address_id:
        raise HTTPException(status_code=400, detail="No delivery address selected")

    try:
        orders = crud.create_orders_from_cart(
            session=session, user=current_user, delivery_address_id=delivery_address_id
        )
        payment = crud.create_unified_payment_for_orders(
            session=session, user=current_user, orders=orders
        )
        # Clear cart after creating orders & payment intent
        from app.crud.cart import clear_cart

        clear_cart(session=session, user_id=current_user.id)

        return CheckoutResponse(
            payment=PaymentPublic.model_validate(payment),
            orders=[serialize_order(o, current_user) for o in orders],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=OrdersPublic)
def my_orders(
    *, session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 50
) -> Any:
    buyer_type = (
        BuyerType.RETAILER
        if current_user.active_role == RoleEnum.RETAILER
        else BuyerType.CUSTOMER
    )
    orders, count = crud.get_orders_for_buyer(
        session=session,
        user_id=current_user.id,
        buyer_type=buyer_type,
        skip=skip,
        limit=limit,
    )
    return OrdersPublic(
        data=[serialize_order(o, current_user) for o in orders], count=count
    )


@router.get(
    "/seller",
    response_model=OrdersPublic,
    dependencies=[Depends(require_role(RoleEnum.RETAILER, RoleEnum.WHOLESALER))],
)
def seller_orders(
    *, session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 50
) -> Any:
    buyer_type = (
        BuyerType.CUSTOMER
        if current_user.active_role == RoleEnum.RETAILER
        else BuyerType.RETAILER
    )
    orders, count = crud.get_orders_for_seller(
        session=session,
        seller_id=current_user.id,
        buyer_type=buyer_type,
        skip=skip,
        limit=limit,
    )
    return OrdersPublic(
        data=[serialize_order(o, current_user) for o in orders], count=count
    )


@router.get(
    "/delivery/mine",
    response_model=OrdersPublic,
    dependencies=[Depends(require_role(RoleEnum.DELIVERY_PARTNER))],
)
def my_delivery_orders(
    *, session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 50
) -> Any:
    orders, count = crud.get_orders_for_delivery_partner(
        session=session, delivery_partner_id=current_user.id, skip=skip, limit=limit
    )
    return OrdersPublic(
        data=[serialize_order(o, current_user) for o in orders], count=count
    )


@router.get("/{order_id}", response_model=OrderPublic)
def get_order(
    *, session: SessionDep, order_id: uuid.UUID, current_user: CurrentUser
) -> Any:
    order = crud.get_order_by_id(session=session, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if (
        current_user.id != order.buyer_id
        and current_user.id != order.seller_id
        and current_user.id != (order.delivery_partner_id or uuid.UUID(int=0))
        and not current_user.has_role(RoleEnum.ADMIN)
    ):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return serialize_order(order, current_user)


@router.patch("/{order_id}/status", response_model=OrderPublic)
def update_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    order_id: uuid.UUID,
    status: OrderStatus,
    notes: str | None = None,
) -> Any:
    order = crud.get_order_by_id(session=session, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if status in FORBIDDEN_TARGETS:
        raise HTTPException(status_code=400, detail="Unsupported status transition")

    hints = get_order_action_hints(order, current_user)
    if not hints:
        raise HTTPException(status_code=403, detail="No actions available for user")

    if status == OrderStatus.CANCELLED:
        if not hints.can_cancel:
            raise HTTPException(status_code=403, detail="Order cannot be cancelled")
    else:
        if hints.next_status is None or status != hints.next_status:
            raise HTTPException(
                status_code=400,
                detail="Invalid status transition",
            )

    old_status = order.order_status.value
    order = crud.update_order_status(
        session=session,
        order=order,
        new_status=status,
        updated_by=current_user.id,
        notes=notes,
    )

    # Email notifications: always notify buyer; notify seller on terminal states
    try:
        buyer = order.buyer
        if buyer and buyer.email:
            email_obj = generate_order_status_update_email(
                order={
                    "order_number": order.order_number,
                    "order_total": order.order_total,
                    "delivery_fee": order.delivery_fee,
                    "order_status": order.order_status.value,
                },
                old_status=old_status,
                new_status=order.order_status.value,
                notes=notes,
            )
            send_email(
                email_to=buyer.email,
                subject=email_obj.subject,
                html_content=email_obj.html_content,
            )
        if order.order_status in {
            OrderStatus.CANCELLED,
            OrderStatus.RETURNED,
            OrderStatus.REFUNDED,
        }:
            seller = order.seller
            if seller and seller.email:
                email_obj2 = generate_order_status_update_email(
                    order={
                        "order_number": order.order_number,
                        "order_total": order.order_total,
                        "delivery_fee": order.delivery_fee,
                        "order_status": order.order_status.value,
                    },
                    old_status=old_status,
                    new_status=order.order_status.value,
                    notes=notes,
                )
                send_email(
                    email_to=seller.email,
                    subject=email_obj2.subject,
                    html_content=email_obj2.html_content,
                )
    except Exception:  # pragma: no cover
        pass

    return serialize_order(order, current_user)


@router.post(
    "/{order_id}/claim",
    response_model=OrderPublic,
    dependencies=[Depends(require_role(RoleEnum.DELIVERY_PARTNER))],
)
def claim_delivery(
    *, session: SessionDep, current_user: CurrentUser, order_id: uuid.UUID
) -> Any:
    order = crud.get_order_by_id(session=session, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if (
        order.order_status != OrderStatus.READY_TO_SHIP
        or order.delivery_partner_id is not None
    ):
        raise HTTPException(status_code=400, detail="Order is not available to claim")

    order.delivery_partner_id = current_user.id
    order = crud.update_order_status(
        session=session,
        order=order,
        new_status=OrderStatus.DELIVERY_PARTNER_ASSIGNED,
        updated_by=current_user.id,
    )

    # Notify buyer and seller that delivery has been claimed
    try:
        dp_name = current_user.full_name or "Delivery Partner"
        payload = {
            "order_number": order.order_number,
            "order_status": order.order_status.value,
        }
        buyer = order.buyer
        seller = order.seller
        if buyer and buyer.email:
            e1 = generate_delivery_claimed_email(
                order=payload, delivery_partner_name=dp_name
            )
            send_email(
                email_to=buyer.email,
                subject=e1.subject,
                html_content=e1.html_content,
            )
        if seller and seller.email:
            e2 = generate_delivery_claimed_email(
                order=payload, delivery_partner_name=dp_name
            )
            send_email(
                email_to=seller.email,
                subject=e2.subject,
                html_content=e2.html_content,
            )
    except Exception:  # pragma: no cover
        pass

    return serialize_order(order, current_user)


@router.get("/delivery/available")
def available_deliveries(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    latitude: float,
    longitude: float,
    skip: int = 0,
    limit: int = 50,
):
    if current_user.active_role != RoleEnum.DELIVERY_PARTNER:
        raise HTTPException(status_code=403, detail="Delivery partner role required")
    rows = crud.get_available_delivery_orders(
        session=session,
        origin_lat=latitude,
        origin_lon=longitude,
        skip=skip,
        limit=limit,
    )
    # Return lightweight objects with computed distances
    out = []
    for order, pickup_distance, journey_distance in rows:
        out.append(
            {
                "order": serialize_order(order, current_user),
                "pickup_distance_km": (
                    round(pickup_distance, 2) if pickup_distance is not None else None
                ),
                "journey_distance_km": (
                    round(journey_distance, 2) if journey_distance is not None else None
                ),
            }
        )
    return {"data": out, "count": len(out)}
