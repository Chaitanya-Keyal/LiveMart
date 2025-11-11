from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.models import RoleEnum, TokenPayload, User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*allowed_roles: RoleEnum):
    """
    Dependency to check if the current user has one of the allowed roles.
    Usage: dependencies=[Depends(require_role(RoleEnum.ADMIN, RoleEnum.RETAILER))]
    """

    def role_checker(current_user: CurrentUser) -> User:
        if not current_user.active_role:
            raise HTTPException(
                status_code=400,
                detail="No active role selected. Please select a role first.",
            )

        if current_user.active_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(r.value for r in allowed_roles)}",
            )

        return current_user

    return role_checker


def require_admin(current_user: CurrentUser) -> User:
    """Dependency to require admin role."""
    if not current_user.has_role(RoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
