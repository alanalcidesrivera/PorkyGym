# api/management/commands/seed_metodos_pago.py
from django.core.management.base import BaseCommand

from api.membresias import METODOS_PAGO_BASE, asegurar_metodos_pago


class Command(BaseCommand):
    help = (
        'Garantiza (de forma idempotente) los métodos de pago base: '
        + ', '.join(METODOS_PAGO_BASE)
    )

    def handle(self, *args, **options):
        metodos = asegurar_metodos_pago()
        for descripcion in METODOS_PAGO_BASE:
            metodo = metodos[descripcion]
            self.stdout.write(
                self.style.SUCCESS(
                    f"OK método de pago '{metodo.descripcion}' (id={metodo.id_metodo_pago})"
                )
            )
