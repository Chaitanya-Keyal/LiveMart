import uuid

from sqlmodel import Session, select

from app.models.address import Address, AddressCreate, AddressUpdate
from app.models.user import User


def get_addresses_for_user(*, session: Session, user: User) -> list[Address]:
    statement = (
        select(Address).where(Address.user_id == user.id).order_by(Address.created_at)
    )
    results = session.exec(statement).all()
    return list(results)


def get_address_for_user(
    *, session: Session, user: User, address_id: uuid.UUID
) -> Address | None:
    statement = select(Address).where(
        Address.id == address_id, Address.user_id == user.id
    )
    return session.exec(statement).first()


def create_address(
    *, session: Session, user: User, address_in: AddressCreate
) -> Address:
    db_address = Address.model_validate(address_in, update={"user_id": user.id})
    session.add(db_address)
    session.flush()

    if not user.active_address_id:
        user.active_address_id = db_address.id
        session.add(user)

    session.commit()
    session.refresh(db_address)
    return db_address


def update_address(
    *, session: Session, db_address: Address, address_in: AddressUpdate
) -> Address:
    update_data = address_in.model_dump(exclude_unset=True)
    db_address.sqlmodel_update(update_data)
    session.add(db_address)
    session.commit()
    session.refresh(db_address)
    return db_address


def delete_address(*, session: Session, user: User, address: Address) -> None:
    deleting_active = user.active_address_id == address.id
    session.delete(address)
    session.flush()

    if deleting_active:
        statement = (
            select(Address)
            .where(Address.user_id == user.id)
            .order_by(Address.created_at)
        )
        next_address = session.exec(statement).first()
        user.active_address_id = next_address.id if next_address else None
        session.add(user)

    session.commit()


def set_active_address(*, session: Session, user: User, address: Address) -> User:
    user.active_address_id = address.id
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
