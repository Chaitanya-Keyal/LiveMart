from typing import Any

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models.role import RoleEnum, UserRole
from app.models.user import User, UserCreate, UserUpdate


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.flush()

    for role in user_create.roles:
        user_role = UserRole(user_id=db_obj.id, role=role)
        session.add(user_role)

    if user_create.roles:
        db_obj.active_role = user_create.roles[0]

    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def add_role_to_user(*, session: Session, user: User, role: RoleEnum) -> User:
    """Add a role to a user if they don't already have it."""
    if not user.has_role(role):
        user_role = UserRole(user_id=user.id, role=role)
        session.add(user_role)
        if not user.active_role:
            user.active_role = role
        session.commit()
        session.refresh(user)
    return user


def remove_role_from_user(*, session: Session, user: User, role: RoleEnum) -> User:
    """Remove a role from a user."""
    if role == RoleEnum.ADMIN:
        raise ValueError("Cannot remove admin role")

    for user_role in user.user_roles:
        if user_role.role == role:
            session.delete(user_role)

            if user.active_role == role:
                remaining_roles = [ur.role for ur in user.user_roles if ur.role != role]
                user.active_role = remaining_roles[0] if remaining_roles else None

            session.commit()
            session.refresh(user)
            break

    return user


def switch_active_role(*, session: Session, user: User, role: RoleEnum) -> User:
    """Switch the user's active role."""
    if not user.has_role(role):
        raise ValueError(f"User does not have role: {role}")

    user.active_role = role
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
