import uuid
from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select

from app.models.otp import OTP, OTPPurpose
from app.utils import generate_otp


def create_otp(
    *,
    session: Session,
    user_id: uuid.UUID,
    purpose: OTPPurpose,
    expiry_minutes: int = 10,
) -> OTP:
    statement = select(OTP).where(
        OTP.user_id == user_id,
        OTP.purpose == purpose,
        OTP.is_used == False,  # noqa: E712
        OTP.expires_at > datetime.now(UTC),
    )
    existing_otps = session.exec(statement).all()
    for otp in existing_otps:
        otp.is_used = True
        session.add(otp)

    code = generate_otp()
    expires_at = datetime.now(UTC) + timedelta(minutes=expiry_minutes)

    db_otp = OTP(
        user_id=user_id,
        code=code,
        purpose=purpose,
        expires_at=expires_at,
    )
    session.add(db_otp)
    session.commit()
    session.refresh(db_otp)
    return db_otp


def verify_otp(
    *,
    session: Session,
    user_id: uuid.UUID,
    code: str,
    purpose: OTPPurpose,
    max_attempts: int = 5,
) -> bool:
    statement = select(OTP).where(
        OTP.user_id == user_id,
        OTP.code == code,
        OTP.purpose == purpose,
        OTP.is_used == False,  # noqa: E712
        OTP.expires_at > datetime.now(UTC),
    )
    otp = session.exec(statement).first()

    if not otp:
        return False

    otp.attempts += 1

    if otp.attempts > max_attempts:
        otp.is_used = True
        session.add(otp)
        session.commit()
        return False

    otp.is_used = True
    session.add(otp)
    session.commit()
    return True
