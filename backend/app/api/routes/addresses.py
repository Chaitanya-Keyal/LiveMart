import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models.address import Address, AddressCreate, AddressPublic, AddressUpdate

router = APIRouter(prefix="/users/me/addresses", tags=["addresses"])

ADDRESS_NOT_FOUND = "Address not found"


def _to_public(address: Address, active_id: uuid.UUID | None) -> AddressPublic:
    model = AddressPublic.model_validate(address)
    model.is_active = address.id == active_id
    return model


@router.get("/", response_model=list[AddressPublic])
def list_addresses(session: SessionDep, current_user: CurrentUser) -> Any:
    session.refresh(current_user)
    addresses = crud.get_addresses_for_user(session=session, user=current_user)
    return [
        _to_public(address, current_user.active_address_id) for address in addresses
    ]


@router.post("/", response_model=AddressPublic, status_code=status.HTTP_201_CREATED)
def create_address(
    *, session: SessionDep, current_user: CurrentUser, address_in: AddressCreate
) -> Any:
    address = crud.create_address(
        session=session, user=current_user, address_in=address_in
    )
    session.refresh(current_user)
    return _to_public(address, current_user.active_address_id)


@router.patch("/{address_id}", response_model=AddressPublic)
def update_address(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    address_id: uuid.UUID,
    address_in: AddressUpdate,
) -> Any:
    address = crud.get_address_for_user(
        session=session, user=current_user, address_id=address_id
    )
    if not address:
        raise HTTPException(status_code=404, detail=ADDRESS_NOT_FOUND)
    updated = crud.update_address(
        session=session, db_address=address, address_in=address_in
    )
    session.refresh(current_user)
    return _to_public(updated, current_user.active_address_id)


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    *, session: SessionDep, current_user: CurrentUser, address_id: uuid.UUID
) -> None:
    address = crud.get_address_for_user(
        session=session, user=current_user, address_id=address_id
    )
    if not address:
        raise HTTPException(status_code=404, detail=ADDRESS_NOT_FOUND)
    crud.delete_address(session=session, user=current_user, address=address)
    session.refresh(current_user)


@router.patch("/{address_id}/set-active", response_model=AddressPublic)
def set_active_address(
    *, session: SessionDep, current_user: CurrentUser, address_id: uuid.UUID
) -> Any:
    address = crud.get_address_for_user(
        session=session, user=current_user, address_id=address_id
    )
    if not address:
        raise HTTPException(status_code=404, detail=ADDRESS_NOT_FOUND)
    crud.set_active_address(session=session, user=current_user, address=address)
    session.refresh(current_user)
    return _to_public(address, current_user.active_address_id)
