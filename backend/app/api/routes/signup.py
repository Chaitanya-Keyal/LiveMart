from datetime import timedelta

from fastapi import APIRouter, HTTPException

from app import crud
from app.api.deps import CurrentUserUnverified, SessionDep
from app.core import security
from app.core.config import settings
from app.models.common import Message
from app.models.otp import OTPPurpose, OTPVerify
from app.models.user import UserCreate, UserPublic, UserPublicWithToken, UserRegister
from app.utils import generate_otp_email, send_email

router = APIRouter(prefix="/users", tags=["users-signup"])


@router.post("/signup", response_model=UserPublicWithToken)
def register_user(session: SessionDep, user_in: UserRegister) -> UserPublicWithToken:
    """
    Create new user with email verification.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user_create = UserCreate.model_validate(user_in)
    user = crud.create_user(session=session, user_create=user_create)

    # Send verification OTP
    if settings.emails_enabled:
        otp = crud.create_otp(
            session=session,
            user_id=user.id,
            purpose=OTPPurpose.EMAIL_VERIFICATION,
            expiry_minutes=15,
        )
        email_data = generate_otp_email(
            email_to=user.email,
            username=user.email,
            code=otp.code,
            purpose="verification",
        )
        send_email(
            email_to=user.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )

    user_public = UserPublic.model_validate(user)
    user_public.roles = user.get_roles()
    return UserPublicWithToken(user=user_public, access_token=access_token)


@router.post("/verify-email")
def verify_email(
    body: OTPVerify, session: SessionDep, current_user: CurrentUserUnverified
) -> Message:
    """
    Verify user email with OTP.
    """
    if current_user.email != body.email:
        raise HTTPException(status_code=400, detail="Email mismatch")

    if getattr(current_user, "email_verified", False):
        return Message(message="Email already verified")

    is_valid = crud.verify_otp(
        session=session,
        user_id=current_user.id,
        code=body.code,
        purpose=OTPPurpose.EMAIL_VERIFICATION,
    )

    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code",
        )

    if hasattr(current_user, "email_verified"):
        current_user.email_verified = True
        session.add(current_user)
        session.commit()

    return Message(message="Email verified successfully")


@router.post("/resend-verification")
def resend_verification_otp(
    session: SessionDep, current_user: CurrentUserUnverified
) -> Message:
    """
    Resend email verification OTP.
    """
    if getattr(current_user, "email_verified", False):
        return Message(message="Email already verified")

    otp = crud.create_otp(
        session=session,
        user_id=current_user.id,
        purpose=OTPPurpose.EMAIL_VERIFICATION,
        expiry_minutes=15,
    )

    if settings.emails_enabled:
        email_data = generate_otp_email(
            email_to=current_user.email,
            username=current_user.email,
            code=otp.code,
            purpose="verification",
        )
        send_email(
            email_to=current_user.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )

    return Message(message="Verification code sent")
