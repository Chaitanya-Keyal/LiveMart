import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import RoleEnum
from app.models.common import Message
from app.models.item import Item, ItemCreate, ItemPublic, ItemsPublic, ItemUpdate

router = APIRouter(prefix="/items", tags=["items"])

ITEM_NOT_FOUND = "Item not found"
NOT_ENOUGH_PERMISSIONS = "Not enough permissions"


@router.get("/", response_model=ItemsPublic)
def read_items(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve items for current user's active role.
    Admins can see all items.
    """
    if not current_user.active_role:
        raise HTTPException(status_code=400, detail="No active role selected")

    if current_user.has_role(RoleEnum.ADMIN):
        count_statement = select(func.count()).select_from(Item)
        count = session.exec(count_statement).one()
        statement = select(Item).offset(skip).limit(limit)
        items = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(Item)
            .where(Item.owner_id == current_user.id)
            .where(Item.role_context == current_user.active_role)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(Item)
            .where(Item.owner_id == current_user.id)
            .where(Item.role_context == current_user.active_role)
            .offset(skip)
            .limit(limit)
        )
        items = session.exec(statement).all()

    return ItemsPublic(data=items, count=count)


@router.get("/{id}", response_model=ItemPublic)
def read_item(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get item by ID.
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail=ITEM_NOT_FOUND)

    if not current_user.has_role(RoleEnum.ADMIN) and (
        item.owner_id != current_user.id
        or item.role_context != current_user.active_role
    ):
        raise HTTPException(status_code=403, detail=NOT_ENOUGH_PERMISSIONS)

    return item


@router.post("/", response_model=ItemPublic)
def create_item(
    *, session: SessionDep, current_user: CurrentUser, item_in: ItemCreate
) -> Any:
    """
    Create new item in the context of the user's active role.
    """
    if not current_user.active_role:
        raise HTTPException(status_code=400, detail="No active role selected")

    item = crud.create_item(
        session=session,
        item_in=item_in,
        owner_id=current_user.id,
        role_context=current_user.active_role,
    )
    return item


@router.put("/{id}", response_model=ItemPublic)
def update_item(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    item_in: ItemUpdate,
) -> Any:
    """
    Update an item.
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail=ITEM_NOT_FOUND)

    if not current_user.has_role(RoleEnum.ADMIN) and (
        item.owner_id != current_user.id
        or item.role_context != current_user.active_role
    ):
        raise HTTPException(status_code=403, detail=NOT_ENOUGH_PERMISSIONS)

    update_dict = item_in.model_dump(exclude_unset=True)
    item.sqlmodel_update(update_dict)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{id}")
def delete_item(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an item.
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail=ITEM_NOT_FOUND)

    if not current_user.has_role(RoleEnum.ADMIN) and (
        item.owner_id != current_user.id
        or item.role_context != current_user.active_role
    ):
        raise HTTPException(status_code=403, detail=NOT_ENOUGH_PERMISSIONS)

    session.delete(item)
    session.commit()
    return Message(message="Item deleted successfully")
