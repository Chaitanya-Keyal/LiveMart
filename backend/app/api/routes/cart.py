import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models.order import CartItemCreate, CartItemUpdate, CartPublic

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("/", response_model=CartPublic)
def get_cart(session: SessionDep, current_user: CurrentUser) -> Any:
    cart = crud.get_cart_with_items(session=session, user_id=current_user.id)
    return CartPublic.model_validate(cart)


@router.post("/items", response_model=CartPublic)
def add_item(
    *, session: SessionDep, current_user: CurrentUser, item: CartItemCreate
) -> Any:
    try:
        cart = crud.add_to_cart(
            session=session,
            user=current_user,
            product_id=item.product_id,
            quantity=item.quantity,
        )
        return CartPublic.model_validate(cart)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/items/{cart_item_id}", response_model=CartPublic)
def update_item(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    cart_item_id: uuid.UUID,
    item: CartItemUpdate,
) -> Any:
    try:
        cart = crud.update_cart_item_quantity(
            session=session,
            user_id=current_user.id,
            cart_item_id=cart_item_id,
            quantity=item.quantity,
        )
        return CartPublic.model_validate(cart)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/items/{cart_item_id}", response_model=CartPublic)
def remove_item(
    *, session: SessionDep, current_user: CurrentUser, cart_item_id: uuid.UUID
) -> Any:
    try:
        cart = crud.remove_from_cart(
            session=session, user_id=current_user.id, cart_item_id=cart_item_id
        )
        return CartPublic.model_validate(cart)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/", response_model=CartPublic)
def clear_cart(*, session: SessionDep, current_user: CurrentUser) -> Any:
    cart = crud.clear_cart(session=session, user_id=current_user.id)
    return CartPublic.model_validate(cart)
