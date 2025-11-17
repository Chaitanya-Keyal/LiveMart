import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    require_admin,
)
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.common import Message
from app.models.role import RoleEnum
from app.models.user import (
    RoleAdd,
    RoleRemove,
    RoleSwitch,
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)
from app.utils import generate_new_account_email, send_email

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/",
    dependencies=[Depends(require_admin)],
    response_model=UsersPublic,
)
def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve users.
    """

    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()

    statement = select(User).offset(skip).limit(limit)
    users = session.exec(statement).all()

    return UsersPublic(
        data=[
            UserPublic(**user.model_dump(), roles=user.get_roles()) for user in users
        ],
        count=count,
    )


@router.post("/", dependencies=[Depends(require_admin)], response_model=UserPublic)
def create_user(*, session: SessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    user = crud.create_user(session=session, user_create=user_in)
    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(
            email_to=user_in.email, username=user_in.email, password=user_in.password
        )
        send_email(
            email_to=user_in.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return user


@router.patch("/me", response_model=UserPublic)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """

    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    user_data = user_in.model_dump(exclude_unset=True)
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(body.new_password)
    current_user.hashed_password = hashed_password
    session.add(current_user)
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return UserPublic(**current_user.model_dump(), roles=current_user.get_roles())


@router.delete("/me", response_model=Message)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Deactivate own user account.
    """
    if current_user.has_role(RoleEnum.ADMIN):
        raise HTTPException(
            status_code=403,
            detail="Admin users are not allowed to deactivate themselves",
        )
    current_user.is_active = False
    session.add(current_user)
    session.commit()
    return Message(message="User account deactivated successfully")


@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )
    if user != current_user and not current_user.has_role(RoleEnum.ADMIN):
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    return UserPublic(**user.model_dump(), roles=user.get_roles())


@router.patch(
    "/{user_id}",
    dependencies=[Depends(require_admin)],
    response_model=UserPublic,
)
def update_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user.
    """

    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )

    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user


@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    """
    Deactivate a user account.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(
            status_code=403,
            detail="Admin users are not allowed to deactivate themselves",
        )
    user.is_active = False
    session.add(user)
    session.commit()
    return Message(message="User account deactivated successfully")


@router.get("/me/roles", response_model=list[RoleEnum])
def get_user_roles(current_user: CurrentUser) -> Any:
    """
    Get all roles for the current user.
    """
    return current_user.get_roles()


@router.post("/me/roles", response_model=UserPublic)
def add_user_role(
    *, session: SessionDep, current_user: CurrentUser, role_data: RoleAdd
) -> Any:
    """
    Add a role to the current user.
    """
    if role_data.role == RoleEnum.ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Cannot self-assign admin role",
        )

    if current_user.has_role(role_data.role):
        raise HTTPException(
            status_code=400,
            detail=f"User already has role: {role_data.role.value}",
        )

    user = crud.add_role_to_user(
        session=session, user=current_user, role=role_data.role
    )
    return user


@router.delete("/me/roles", response_model=UserPublic)
def remove_user_role(
    *, session: SessionDep, current_user: CurrentUser, role_data: RoleRemove
) -> Any:
    """
    Remove a role from the current user.
    WARNING: All data associated with this role context will become inaccessible.
    """
    if role_data.role == RoleEnum.ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove admin role",
        )

    if not current_user.has_role(role_data.role):
        raise HTTPException(
            status_code=400,
            detail=f"User does not have role: {role_data.role.value}",
        )

    # Check if user has other roles
    if len(current_user.get_roles()) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove last role. User must have at least one role.",
        )

    user = crud.remove_role_from_user(
        session=session, user=current_user, role=role_data.role
    )
    return user


@router.patch("/me/active-role", response_model=UserPublic)
def switch_user_role(
    *, session: SessionDep, current_user: CurrentUser, role_data: RoleSwitch
) -> Any:
    """
    Switch the active role for the current user.
    """
    if not current_user.has_role(role_data.role):
        raise HTTPException(
            status_code=400,
            detail=f"User does not have role: {role_data.role.value}. Add the role first.",
        )

    user = crud.switch_active_role(
        session=session, user=current_user, role=role_data.role
    )
    return user
