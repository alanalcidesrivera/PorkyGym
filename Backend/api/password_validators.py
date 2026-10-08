# api/password_validators.py
"""
Validador de complejidad de contraseña para Django.

Se aplica SOLO en el momento en que el usuario elige una contraseña nueva:
- Registro (POST /api/auth/registro/)
- Restablecer contraseña (POST /api/auth/confirmar-reset/...)
- Cambiar contraseña estando logueado (POST /api/auth/cambiar-password/)

NO se aplica al iniciar sesión, porque en el login solo se verifica que
la contraseña coincida con la almacenada.
"""
import re

from django.core.exceptions import ValidationError


class ComplexityPasswordValidator:
    """Exige: mínimo 8 caracteres, mayúscula, minúscula, número y símbolo."""

    def __init__(self, min_length=8):
        self.min_length = min_length

    def validate(self, password, user=None):
        if len(password) < self.min_length:
            raise ValidationError(
                f"La contraseña debe tener al menos {self.min_length} caracteres."
            )
        if not re.search(r"[A-Z]", password):
            raise ValidationError(
                "La contraseña debe contener al menos una letra mayúscula."
            )
        if not re.search(r"[a-z]", password):
            raise ValidationError(
                "La contraseña debe contener al menos una letra minúscula."
            )
        if not re.search(r"\d", password):
            raise ValidationError(
                "La contraseña debe contener al menos un número."
            )
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-\.]", password):
            raise ValidationError(
                "La contraseña debe contener al menos un símbolo especial (!@#$%^&*,._-)."
            )

    def get_help_text(self):
        return (
            "La contraseña debe tener al menos 8 caracteres e incluir "
            "mayúscula, minúscula, número y símbolo."
        )