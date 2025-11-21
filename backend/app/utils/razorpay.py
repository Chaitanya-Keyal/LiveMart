import hmac
from hashlib import sha256
from typing import Any

import httpx

from app.core.config import settings


class RazorpayClient:
    """Minimal Razorpay client for Orders API using httpx.

    Avoids adding a new heavy dependency; sufficient for creating orders in test mode.
    """

    BASE_URL = "https://api.razorpay.com/v1"

    def __init__(self, key_id: str, key_secret: str) -> None:
        self._auth = (key_id, key_secret)

    def create_order(self, amount_paise: int, currency: str = "INR") -> dict[str, Any]:
        payload = {"amount": amount_paise, "currency": currency}
        url = f"{self.BASE_URL}/orders"
        with httpx.Client(auth=self._auth, timeout=20.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()


def create_razorpay_order(amount_paise: int, currency: str = "INR") -> dict[str, Any]:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise RuntimeError("Razorpay keys are not configured")
    client = RazorpayClient(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    return client.create_order(amount_paise=amount_paise, currency=currency)


def verify_webhook_signature(body_bytes: bytes, signature: str, secret: str) -> bool:
    computed = hmac.new(secret.encode("utf-8"), body_bytes, sha256).hexdigest()
    return hmac.compare_digest(computed, signature)


def amount_rupees_to_paise(amount: float | int) -> int:
    return int(round(float(amount) * 100))
