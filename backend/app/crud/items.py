import uuid

from sqlmodel import Session

from app.models.item import Item, ItemCreate, RoleEnum


def create_item(
    *,
    session: Session,
    item_in: ItemCreate,
    owner_id: uuid.UUID,
    role_context: RoleEnum,
) -> Item:
    db_item = Item.model_validate(
        item_in, update={"owner_id": owner_id, "role_context": role_context}
    )
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item
