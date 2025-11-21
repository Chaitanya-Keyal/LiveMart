from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from sqlmodel import select

from app.api.deps import SessionDep
from app.core.config import settings
from app.models.common import Message
from app.models.order import (
    Order,
    OrderStatus,
    OrderStatusHistory,
    Payment,
    PaymentStatus,
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
    x_razorpay_signature: str | None = Header(default=None),
) -> Any:
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

        orders = session.exec(select(Order).where(Order.payment_id == payment.id)).all()
        order_summaries = []

        buyer = payment.buyer
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
            send_email(
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
                send_email(
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
