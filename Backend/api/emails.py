# api/emails.py
"""
Envío de correos transaccionales usando la API REST de Brevo (Sendinblue).

Configuración requerida en Backend/.env:
    BREVO_API_KEY="tu_api_key_de_brevo"
    BREVO_SENDER_EMAIL="correo_verificado_en_brevo@dominio.com"

Para obtener la API Key: https://app.brevo.com/settings/keys/smtp
  -> menú "SMTP & API" / "API Keys" -> "Generate a new API key".
"""
import json
import logging
import urllib.error
import urllib.request

from decouple import config

logger = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def enviar_correo_brevo(destinatario: str, asunto: str, contenido_html: str) -> bool:
    """Envía un correo transaccional vía Brevo. Devuelve True si se envió."""
    api_key = config("BREVO_API_KEY", default="").strip()
    sender_email = config("BREVO_SENDER_EMAIL", default="soporte@porkygym.com").strip()

    if not api_key:
        logger.warning(
            "BREVO_API_KEY no configurada. No se pudo enviar correo a %s.", destinatario
        )
        return False

    payload = {
        "sender": {"email": sender_email, "name": "Porky Gym"},
        "to": [{"email": destinatario}],
        "subject": asunto,
        "htmlContent": contenido_html,
    }

    req = urllib.request.Request(
        BREVO_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "api-key": api_key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status in (200, 201)
    except urllib.error.HTTPError as e:
        detalle = e.read().decode("utf-8", "replace")
        logger.error("Brevo HTTP %s al enviar a %s: %s", e.code, destinatario, detalle)
        return False
    except Exception as e:  # noqa: BLE001 - fallo de red/tiempo de espera
        logger.error("Brevo error al enviar a %s: %s", destinatario, e)
        return False