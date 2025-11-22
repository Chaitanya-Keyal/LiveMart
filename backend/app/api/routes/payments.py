from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from sqlmodel import select

from app import crud
from app.api.deps import SessionDep, require_admin
from app.models.common import Message
from app.models.order import (
    Order,
    OrderPublic,
    OrderStatus,
    OrderStatusHistory,
    Payment,
    PaymentStatus,
)
from app.models.settlement import (
    PaymentSettlementCreate,
    PaymentSettlementPublic,
    PaymentSettlementsPublic,
)
from app.utils.email import (
    generate_new_order_notification_email,
    generate_order_confirmation_email,
    send_email,
)
from app.utils.razorpay import verify_webhook_signature

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    session: SessionDep,
    background_tasks: BackgroundTasks,
    x_razorpay_signature: str | None = Header(default=None),
) -> Any:
    from app.core.config import settings

    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook not configured")

    body = await request.body()
    if not x_razorpay_signature or not verify_webhook_signature(
        body, x_razorpay_signature, settings.RAZORPAY_WEBHOOK_SECRET
    ):
        raise HTTPException(status_code=400, detail="Invalid signature")

    payload = await request.json()
    event = payload.get("event")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = entity.get("order_id")
    payment_id = entity.get("id")

    if not order_id:
        return Message(message="ignored")

    payment = session.exec(
        select(Payment).where(Payment.razorpay_order_id == order_id)
    ).first()
    if not payment:
        return Message(message="payment not found; ignored")

    if event == "payment.captured":
        # Idempotency guard: skip if we've already completed this payment
        if payment.status == PaymentStatus.COMPLETED:
            return Message(message="ok")

        payment.status = PaymentStatus.COMPLETED
        payment.razorpay_payment_id = payment_id
        session.add(payment)

        # Increment coupon usage if coupon was used
        from app.crud import increment_coupon_usage
        from app.models.coupon import Coupon, PaymentCoupon

        payment_coupon = session.exec(
            select(PaymentCoupon).where(PaymentCoupon.payment_id == payment.id)
        ).first()
        if payment_coupon:
            coupon = session.get(Coupon, payment_coupon.coupon_id)
            if coupon:
                increment_coupon_usage(session=session, coupon=coupon)

        orders = session.exec(select(Order).where(Order.payment_id == payment.id)).all()
        order_summaries = []

        buyer = payment.buyer

        # Clear buyer's cart on successful payment
        from app.crud.cart import clear_cart

        clear_cart(session=session, user_id=buyer.id)

        for o in orders:
            o.order_status = OrderStatus.CONFIRMED
            session.add(o)
            session.add(
                OrderStatusHistory(
                    order_id=o.id,
                    status=OrderStatus.CONFIRMED,
                    updated_by_id=payment.buyer_id,
                )
            )
            # Build summary for confirmation email
            order_summaries.append(
                {
                    "order_number": o.order_number,
                    "seller_name": o.seller.full_name or "Seller",
                    "items_count": len(o.items),
                    "order_total": o.order_total,
                    "delivery_fee": o.delivery_fee,
                }
            )
        session.commit()

        # Send buyer order confirmation (single email summarizing all orders)
        if buyer and buyer.email:
            conf = generate_order_confirmation_email(
                buyer_name=buyer.full_name,
                orders=order_summaries,
                payment={"total_amount": payment.total_amount},
            )
            background_tasks.add_task(
                send_email,
                email_to=buyer.email,
                subject=conf.subject,
                html_content=conf.html_content,
            )

        # Send each seller a new order notification
        for o in orders:
            seller = o.seller
            if seller and seller.email:
                notif = generate_new_order_notification_email(
                    seller_name=seller.full_name,
                    order={
                        "order_number": o.order_number,
                        "order_total": o.order_total,
                        "delivery_fee": o.delivery_fee,
                        "items": [
                            {
                                "product_name": it.product_name,
                                "quantity": it.quantity,
                                "price_paid": it.price_paid,
                            }
                            for it in o.items
                        ],
                    },
                )
                background_tasks.add_task(
                    send_email,
                    email_to=seller.email,
                    subject=notif.subject,
                    html_content=notif.html_content,
                )

        return Message(message="ok")

    if event == "payment.failed":
        payment.status = PaymentStatus.FAILED
        session.add(payment)
        session.commit()
        return Message(message="ok")

    return Message(message="ignored")


@router.get(
    "/settlements/pending",
    dependencies=[Depends(require_admin)],
    response_model=dict,
)
def get_pending_settlements(session: SessionDep) -> Any:
    """Get pending settlements aggregated by user (Admin only)."""
    pending_list, summary = crud.settlements.get_pending_settlements_by_user(
        session=session
    )
    return {
        "pending_settlements": pending_list,
        "summary": summary,
    }


@router.post(
    "/settlements",
    dependencies=[Depends(require_admin)],
    response_model=PaymentSettlementPublic,
)
def create_settlement(
    *, session: SessionDep, settlement_in: PaymentSettlementCreate
) -> Any:
    """Create a settlement for a user (Admin only)."""
    try:
        settlement = crud.settlements.create_settlement(
            session=session, settlement_in=settlement_in
        )
        return settlement
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/settlements/history",
    dependencies=[Depends(require_admin)],
    response_model=PaymentSettlementsPublic,
)
def get_settlement_history(
    session: SessionDep,
    user_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Get settlement history (Admin only)."""
    import uuid

    user_uuid = None
    if user_id:
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID")

    settlements, count = crud.settlements.get_settlement_history(
        session=session, user_id=user_uuid, skip=skip, limit=limit
    )

    return PaymentSettlementsPublic(data=settlements, count=count)


@router.get(
    "/settlements/{settlement_id}",
    dependencies=[Depends(require_admin)],
    response_model=dict,
)
def get_settlement(*, session: SessionDep, settlement_id: str) -> Any:
    """Get settlement by ID with all associated orders (Admin only)."""
    import uuid

    try:
        settlement_uuid = uuid.UUID(settlement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid settlement ID")

    result = crud.settlements.get_settlement_by_id(
        session=session, settlement_id=settlement_uuid
    )
    if not result:
        raise HTTPException(status_code=404, detail="Settlement not found")

    settlement, orders = result

    # Serialize orders
    serialized_orders = []
    for order in orders:
        # Create a minimal serialization without action hints
        serialized_orders.append(OrderPublic.model_validate(order))

    return {
        "settlement": PaymentSettlementPublic.model_validate(settlement),
        "orders": serialized_orders,
    }
