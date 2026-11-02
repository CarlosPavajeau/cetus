import base64
import binascii
import hashlib
import hmac
import time


def verify_cetus_webhook(webhook_id: str, timestamp: str, signature: str, raw_body: bytes, secret: str) -> bool:
    """`webhook_id`, `timestamp` y `signature` son los encabezados `webhook-id`, `webhook-timestamp` y
    `webhook-signature`. `raw_body` es el cuerpo tal como llegó, en bytes, antes de convertirlo a JSON."""
    if not (timestamp.isascii() and timestamp.isdigit()) or abs(time.time() - int(timestamp)) > 300:
        return False
    key = base64.b64decode(secret.removeprefix("whsec_"))
    expected = hmac.new(key, f"{webhook_id}.{timestamp}.".encode() + raw_body, hashlib.sha256).digest()
    for entry in signature.split(" "):
        version, _, value = entry.partition(",")
        try:
            received = base64.b64decode(value, validate=True)
        except binascii.Error:
            continue
        if version == "v1" and hmac.compare_digest(received, expected):
            return True
    return False
