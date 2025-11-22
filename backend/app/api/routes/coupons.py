from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app import crud
from app.api.deps import CurrentUser, SessionDep, require_admin
from app.models.common import Message
from app.models.coupon import (
    CouponCreate,
    CouponPublic,
    CouponsPublic,
    CouponUpdate,
    CouponValidateRequest,
    CouponValidateResponse,
)
from app.utils.email import send_coupon_notification_email

router = APIRouter(prefix="/coupons", tags=["coupons"])


@router.post("/", dependencies=[Depends(require_admin)], response_model=CouponPublic)
def create_coupon(
    *,
    session: SessionDep,
    coupon_in: CouponCreate,
    background_tasks: BackgroundTasks,
) -> Any:
    """Create a new coupon (Admin only)."""
    try:
        coupon = crud.coupons.create_coupon(session=session, coupon_in=coupon_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Send notifications if requested
    if coupon_in.send_notification:
        target_emails = coupon_in.target_emails
        if target_emails is None:
            # Send to all users
            target_emails = crud.coupons.get_all_user_emails(session=session)

        if target_emails:
            background_tasks.add_task(
                send_coupon_notification_email,
                coupon=coupon,
                target_emails=target_emails,
            )

    return coupon


@router.get("/", dependencies=[Depends(require_admin)], response_model=CouponsPublic)
def read_coupons(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """Retrieve all coupons (Admin only)."""
    coupons, count = crud.coupons.get_coupons(session=session, skip=skip, limit=limit)
    return CouponsPublic(data=coupons, count=count)


@router.get("/featured", response_model=list[CouponPublic])
def get_featured_coupons(session: SessionDep) -> Any:
    """Get featured coupons (Public endpoint)."""
    coupons = crud.coupons.get_featured_coupons(session=session, limit=5)
    return coupons


@router.post("/validate", response_model=CouponValidateResponse)
def validate_coupon(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    request: CouponValidateRequest,
) -> Any:
    """Validate a coupon and calculate discount."""
    valid, discount, message = crud.coupons.validate_coupon(
        session=session,
        code=request.code,
        cart_total=request.cart_total,
        user_email=current_user.email,
    )

    return CouponValidateResponse(
        valid=valid,
        discount_amount=discount,
        message=message,
    )


@router.patch(
    "/{coupon_id}", dependencies=[Depends(require_admin)], response_model=CouponPublic
)
def update_coupon(
    *,
    session: SessionDep,
    coupon_id: str,
    coupon_in: CouponUpdate,
) -> Any:
    """Update a coupon (Admin only)."""
    import uuid

    try:
        coupon_uuid = uuid.UUID(coupon_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid coupon ID")

    coupon = crud.coupons.get_coupon_by_id(session=session, coupon_id=coupon_uuid)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    try:
        coupon = crud.coupons.update_coupon(
            session=session, coupon=coupon, coupon_in=coupon_in
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return coupon


@router.delete("/{coupon_id}", dependencies=[Depends(require_admin)])
def delete_coupon(
    *,
    session: SessionDep,
    coupon_id: str,
) -> Any:
    """Delete a coupon (Admin only)."""
    import uuid

    try:
        coupon_uuid = uuid.UUID(coupon_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid coupon ID")

    coupon = crud.coupons.get_coupon_by_id(session=session, coupon_id=coupon_uuid)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    crud.coupons.delete_coupon(session=session, coupon=coupon)
    return Message(message="Coupon deleted successfully")
