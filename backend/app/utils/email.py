import logging
import secrets
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import emails
from jinja2 import Template

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class EmailData:
    html_content: str
    subject: str


def _humanize_status(value: str | None) -> str:
    if not value:
        return ""
    return str(value).replace("_", " ").title()


def _templates_build_dir() -> Path:
    return Path(__file__).resolve().parents[1] / "email-templates" / "build"


def render_email_template(*, template_name: str, context: dict[str, Any]) -> str:
    template_path = _templates_build_dir() / template_name
    template_str = template_path.read_text()
    html_content = Template(template_str).render(context)
    return html_content


def send_email(*, email_to: str, subject: str = "", html_content: str = "") -> None:
    assert settings.emails_enabled, "no provided configuration for email variables"
    message = emails.Message(
        subject=subject,
        html=html_content,
        mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
    )
    smtp_options: dict[str, Any] = {
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
    }
    if settings.SMTP_TLS:
        smtp_options["tls"] = True
    elif settings.SMTP_SSL:
        smtp_options["ssl"] = True
    if settings.SMTP_USER:
        smtp_options["user"] = settings.SMTP_USER
    if settings.SMTP_PASSWORD:
        smtp_options["password"] = settings.SMTP_PASSWORD
    response = message.send(to=email_to, smtp=smtp_options)
    logger.info(f"send email result: {response}")


def generate_reset_password_email(email_to: str, email: str, token: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Password recovery for user {email}"
    link = f"{settings.FRONTEND_HOST}/reset-password?token={token}"
    html_content = render_email_template(
        template_name="reset_password.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": email,
            "email": email_to,
            "valid_hours": settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS,
            "link": link,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_new_account_email(
    email_to: str, username: str, password: str
) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - New account for user {username}"
    html_content = render_email_template(
        template_name="new_account.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": username,
            "password": password,
            "email": email_to,
            "link": settings.FRONTEND_HOST,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_otp() -> str:
    return "".join([str(secrets.randbelow(10)) for _ in range(6)])


def generate_otp_email(
    email_to: str, username: str, code: str, purpose: str
) -> EmailData:
    project_name = settings.PROJECT_NAME

    if purpose == "login":
        subject = f"{project_name} - Your Login Code"
        message = f"Your login code is: {code}"
        valid_minutes = 10
    else:
        subject = f"{project_name} - Verify Your Email"
        message = f"Your verification code is: {code}"
        valid_minutes = 15

    html_content = render_email_template(
        template_name="otp.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": username,
            "email": email_to,
            "valid_minutes": valid_minutes,
            "message": message,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_order_confirmation_email(
    buyer_name: str | None, orders: list[dict], payment: dict
) -> EmailData:
    subject = f"{settings.PROJECT_NAME} - Order Confirmation"
    html_content = render_email_template(
        template_name="order_confirmation.html",
        context={
            "buyer_name": buyer_name,
            "orders": orders,
            "payment": payment,
            "year": datetime.utcnow().year,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_new_order_notification_email(
    seller_name: str | None, order: dict
) -> EmailData:
    subject = f"{settings.PROJECT_NAME} - New Order {order['order_number']}"
    html_content = render_email_template(
        template_name="new_order.html",
        context={
            "seller_name": seller_name,
            "order": order,
            "year": datetime.utcnow().year,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_order_status_update_email(
    order: dict,
    old_status: str,
    new_status: str,
    notes: str | None,
) -> EmailData:
    old_status_label = _humanize_status(old_status)
    new_status_label = _humanize_status(new_status)
    subject = f"{settings.PROJECT_NAME} - Order {order['order_number']} Status Updated"
    html_content = render_email_template(
        template_name="order_status_update.html",
        context={
            "order": order,
            "old_status": old_status,
            "new_status": new_status,
            "old_status_label": old_status_label,
            "new_status_label": new_status_label,
            "notes": notes,
            "year": datetime.utcnow().year,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_delivery_claimed_email(
    order: dict, delivery_partner_name: str | None
) -> EmailData:
    order_payload = dict(order)
    order_payload["order_status_label"] = _humanize_status(order.get("order_status"))
    subject = (
        f"{settings.PROJECT_NAME} - Delivery Claimed for Order {order['order_number']}"
    )
    html_content = render_email_template(
        template_name="delivery_claimed.html",
        context={
            "order": order_payload,
            "delivery_partner_name": delivery_partner_name,
            "year": datetime.utcnow().year,
        },
    )
    return EmailData(html_content=html_content, subject=subject)
