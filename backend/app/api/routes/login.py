import secrets
from datetime import timedelta
from typing import Annotated
from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm

from app import crud
from app.api.deps import SessionDep
from app.core import security
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.common import Message, NewPassword, Token
from app.models.otp import OTPCreate, OTPPurpose, OTPVerify
from app.models.role import RoleEnum
from app.models.user import UserCreate
from app.utils import (
    generate_otp_email,
    generate_password_reset_token,
    generate_reset_password_email,
    send_email,
    verify_password_reset_token,
)

router = APIRouter(tags=["login"])

_oauth = OAuth()
OAUTH_CALLBACK_PATH = "/oauth/google/callback"

INACTIVE_USER_MSG = "Inactive user"


def _get_google_client():
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    client = _oauth.create_client("google")
    if client is None:
        _oauth.register(
            name="google",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"},
        )
        client = _oauth.create_client("google")
    if client is None:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    return client


@router.post("/login/access-token")
def login_access_token(
    session: SessionDep, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = crud.authenticate(
        session=session, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail=INACTIVE_USER_MSG)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
    )


@router.post("/password-recovery/{email}")
def recover_password(email: str, session: SessionDep) -> Message:
    """
    Password Recovery
    """
    user = crud.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(user.email, email, password_reset_token)
    send_email(
        email_to=user.email,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Password recovery email sent")


@router.post("/reset-password/")
def reset_password(session: SessionDep, body: NewPassword) -> Message:
    """
    Reset password
    """
    email = verify_password_reset_token(token=body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = crud.get_user_by_email(session=session, email=email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist in the system.",
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail=INACTIVE_USER_MSG)
    hashed_password = get_password_hash(password=body.new_password)
    user.hashed_password = hashed_password
    session.add(user)
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/login/google")
async def login_with_google(request: Request):
    """
    Redirect the user to the Google OAuth consent screen.
    """
    google = _get_google_client()
    callback_path = request.url_for("login_with_google_callback")
    redirect_uri = f"{settings.BACKEND_HOST}{callback_path.path}"
    return await google.authorize_redirect(request, redirect_uri)


@router.get("/login/google/callback", name="login_with_google_callback")
async def login_with_google_callback(
    request: Request, session: SessionDep
) -> RedirectResponse:
    """
    Handle Google's OAuth callback and issue an access token.
    """
    google = _get_google_client()
    base_url = settings.FRONTEND_HOST.rstrip("/") + OAUTH_CALLBACK_PATH

    try:
        token_data = await google.authorize_access_token(request)
    except Exception:
        return RedirectResponse(
            url=f"{base_url}?{urlencode({'error': 'oauth_error'})}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    user_info = token_data.get("userinfo")
    if not user_info:
        try:
            user_info = await google.parse_id_token(request, token_data)
        except Exception:
            return RedirectResponse(
                url=f"{base_url}?{urlencode({'error': 'oauth_error'})}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

    email = user_info.get("email")
    email_verified_raw = user_info.get("email_verified", False)
    email_verified = (
        email_verified_raw
        if isinstance(email_verified_raw, bool)
        else str(email_verified_raw).lower() == "true"
    )
    full_name = user_info.get("name")

    if not email or not email_verified:
        return RedirectResponse(
            url=f"{base_url}?{urlencode({'error': 'email_not_verified'})}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    user = crud.get_user_by_email(session=session, email=email)
    is_new_user = False
    if not user:
        random_password = secrets.token_urlsafe(32)
        user_create = UserCreate(
            email=email,
            password=random_password,
            full_name=full_name,
            roles=[RoleEnum.CUSTOMER],  # Default role for OAuth users
        )
        user = crud.create_user(session=session, user_create=user_create)
        if hasattr(user, "email_verified") and not user.email_verified:
            user.email_verified = True
            session.add(user)
            session.commit()
        is_new_user = True
    elif not user.is_active:
        return RedirectResponse(
            url=f"{base_url}?{urlencode({'error': 'inactive_user'})}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )

    # Redirect new users to role selection page
    if is_new_user:
        return RedirectResponse(
            url=f"{settings.FRONTEND_HOST}/select-role?{urlencode({'token': access_token, 'new_user': 'true'})}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    return RedirectResponse(
        url=f"{base_url}?{urlencode({'token': access_token})}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.post("/login/otp/request")
def request_login_otp(body: OTPCreate, session: SessionDep) -> Message:
    """
    Request OTP for email-based login.
    """
    user = crud.get_user_by_email(session=session, email=body.email)

    if not user:
        return Message(message="If the email exists, an OTP has been sent")

    if not user.is_active:
        raise HTTPException(status_code=400, detail=INACTIVE_USER_MSG)

    otp = crud.create_otp(
        session=session,
        user_id=user.id,
        purpose=OTPPurpose.LOGIN,
        expiry_minutes=10,
    )

    if settings.emails_enabled:
        email_data = generate_otp_email(
            email_to=user.email,
            username=user.email,
            code=otp.code,
            purpose="login",
        )
        send_email(
            email_to=user.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )

    return Message(message="If the email exists, an OTP has been sent")


@router.post("/login/otp/verify")
def verify_login_otp(body: OTPVerify, session: SessionDep) -> Token:
    """
    Verify OTP and login.
    """
    user = crud.get_user_by_email(session=session, email=body.email)

    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    is_valid = crud.verify_otp(
        session=session,
        user_id=user.id,
        code=body.code,
        purpose=OTPPurpose.LOGIN,
    )

    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP code",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
    )
