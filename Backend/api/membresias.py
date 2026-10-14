# api/membresias.py
"""Lógica de dominio compartida de membresías (CU04 y CU06).

Convención de fechas del sistema (única y consistente):

- ``fecha_inicio`` es inclusiva (primer día cubierto).
- ``fecha_vencimiento`` es exclusiva (primer día NO cubierto).
- El periodo cubierto es ``[fecha_inicio, fecha_vencimiento)``.
- La membresía está vigente si ``hoy < fecha_vencimiento``.
- ``dias_restantes = (fecha_vencimiento - hoy).days``.
- Un nuevo contrato se encadena exactamente en la ``fecha_vencimiento`` del
  contrato pagado anterior (sin solapamientos ni huecos).

Estas reglas se aplican en un solo lugar para no duplicar criterios entre el
alta de socio (CU04) y el registro de contrato (CU06).
"""
from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError

from .models import ContratoMembresia, MetodoPago

METODOS_PAGO_BASE = ('Efectivo', 'Transferencia bancaria')
TASA_CAMBIO_DEFECTO = Decimal('1.0000')


def asegurar_metodos_pago():
    """Garantiza (de forma idempotente) los métodos de pago del sistema.

    Devuelve un diccionario ``{descripcion: MetodoPago}`` con los métodos base
    y no altera ni duplica los que ya existan (conserva sus IDs).
    """
    metodos = {}
    for descripcion in METODOS_PAGO_BASE:
        metodo, _ = MetodoPago.objects.get_or_create(descripcion=descripcion)
        metodos[descripcion] = metodo
    return metodos


def metodo_pago_por_defecto():
    return asegurar_metodos_pago()['Efectivo']


def precio_plan(plan):
    """Precio local esperado de un plan (Decimal)."""
    return Decimal(plan.costo_base_origen)


def validar_pago_exacto(monto, plan):
    """Exige que el pago cubra exactamente el precio del plan.

    Rechaza montos nulos, negativos, menores o mayores al precio. Lanza
    ``django.core.exceptions.ValidationError`` para que cada capa lo adapte a
    su formato (DRF, formularios, etc.).
    """
    if monto is None:
        raise ValidationError('El monto pagado es obligatorio.')
    monto = Decimal(monto)
    if monto < 0:
        raise ValidationError('El monto pagado no puede ser negativo.')
    esperado = precio_plan(plan)
    if monto != esperado:
        raise ValidationError(
            f'El monto pagado debe ser exactamente {esperado} '
            f'(precio del plan "{plan.nombre_plan}"). No se permiten pagos '
            f'parciales ni montos distintos.'
        )


def contrato_predecesor(socio):
    """Contrato pagado que sirve de base para encadenar la nueva vigencia.

    Solo se consideran contratos pagados (``estado_membresia == 'Activa'``),
    ordenados por la fecha de vencimiento más lejana. Ante datos inconsistentes
    (varios contratos simultáneos) se toma el que cubre hasta más adelante,
    evitando así acortar una vigencia ya pagada.
    """
    return (
        ContratoMembresia.objects
        .filter(id_socio=socio, estado_membresia='Activa')
        .order_by('-fecha_vencimiento', '-id_contrato_mem')
        .first()
    )


def calcular_inicio_vencimiento(socio, plan, hoy=None):
    """Calcula el periodo del nuevo contrato.

    - Si el socio tiene una membresía pagada aún vigente, el nuevo contrato
      comienza exactamente en su ``fecha_vencimiento`` (acumula vigencia).
    - Si no está vigente (vencido o sin contrato pagado), comienza hoy.

    Devuelve ``(predecesor, fecha_inicio, fecha_vencimiento)``.
    """
    hoy = hoy or date.today()
    predecesor = contrato_predecesor(socio)
    if predecesor and predecesor.fecha_vencimiento > hoy:
        inicio = predecesor.fecha_vencimiento
    else:
        inicio = hoy
    vencimiento = inicio + timedelta(days=plan.duracion_dias)
    return predecesor, inicio, vencimiento


def crear_contrato_pagado(socio, plan, metodo_pago, hoy=None):
    """Crea un contrato con pago completo y vigencia acumulada (regla CU06).

    El monto almacenado es siempre el precio exacto del plan y el estado
    resultante es 'Activa'. ``id_renovacion`` enlaza con el contrato anterior
    (si existe) y ``tipo_operacion`` distingue 'Alta' de 'Renovacion'.
    """
    hoy = hoy or date.today()
    precio = precio_plan(plan)
    predecesor, inicio, vencimiento = calcular_inicio_vencimiento(socio, plan, hoy)

    return ContratoMembresia.objects.create(
        id_socio=socio,
        id_metodo_pago=metodo_pago,
        id_plan_mem=plan,
        id_renovacion=predecesor,
        tipo_operacion='Renovacion' if predecesor else 'Alta',
        fecha_inicio=inicio,
        fecha_vencimiento=vencimiento,
        tasa_cambio_aplicada=TASA_CAMBIO_DEFECTO,
        monto_pagado_local=precio,
        estado_membresia='Activa',
    )


def _sin_membresia():
    return {
        'estado': 'Sin membresía',
        'tiene_membresia': False,
        'plan': None,
        'fecha_inicio': None,
        'fecha_vencimiento': None,
        'dias_restantes': None,
    }


def resumen_membresia(socio, hoy=None):
    """Resume la vigencia real de un socio a partir de sus contratos pagados.

    Estados derivados: 'Vigente', 'Vencida' o 'Sin membresía'. No crea ni
    modifica contratos; es una lectura pura del histórico.
    """
    if socio is None:
        return _sin_membresia()

    hoy = hoy or date.today()
    pagados = [
        contrato
        for contrato in ContratoMembresia.objects
        .filter(id_socio=socio)
        .select_related('id_plan_mem')
        if contrato.estado_membresia == 'Activa'
    ]

    vigentes = [c for c in pagados if c.fecha_vencimiento > hoy]
    if vigentes:
        actual = max(vigentes, key=lambda c: (c.fecha_vencimiento, c.id_contrato_mem))
        return {
            'estado': 'Vigente',
            'tiene_membresia': True,
            'plan': actual.id_plan_mem.nombre_plan,
            'fecha_inicio': actual.fecha_inicio.isoformat(),
            'fecha_vencimiento': actual.fecha_vencimiento.isoformat(),
            'dias_restantes': (actual.fecha_vencimiento - hoy).days,
        }

    if pagados:
        ultimo = max(pagados, key=lambda c: (c.fecha_vencimiento, c.id_contrato_mem))
        return {
            'estado': 'Vencida',
            'tiene_membresia': False,
            'plan': ultimo.id_plan_mem.nombre_plan,
            'fecha_inicio': ultimo.fecha_inicio.isoformat(),
            'fecha_vencimiento': ultimo.fecha_vencimiento.isoformat(),
            'dias_restantes': 0,
        }

    return _sin_membresia()


def historial_contratos(socio, hoy=None):
    """Devuelve el historial de contratos con su vigencia derivada."""
    if socio is None:
        return []

    hoy = hoy or date.today()
    contratos = (
        ContratoMembresia.objects
        .filter(id_socio=socio)
        .select_related('id_plan_mem', 'id_metodo_pago')
        .order_by('-fecha_inicio', '-id_contrato_mem')
    )

    historial = []
    for contrato in contratos:
        if contrato.estado_membresia != 'Activa':
            vigencia = contrato.estado_membresia
            dias_restantes = None
        elif contrato.fecha_vencimiento > hoy:
            vigencia = 'Vigente'
            dias_restantes = (contrato.fecha_vencimiento - hoy).days
        else:
            vigencia = 'Vencida'
            dias_restantes = 0

        historial.append({
            'id_contrato_mem': contrato.id_contrato_mem,
            'plan': contrato.id_plan_mem.nombre_plan,
            'metodo_pago': contrato.id_metodo_pago.descripcion,
            'tipo_operacion': contrato.tipo_operacion,
            'fecha_inicio': contrato.fecha_inicio.isoformat(),
            'fecha_vencimiento': contrato.fecha_vencimiento.isoformat(),
            'monto_pagado_local': str(contrato.monto_pagado_local),
            'estado_membresia': contrato.estado_membresia,
            'vigencia': vigencia,
            'dias_restantes': dias_restantes,
            'id_renovacion': contrato.id_renovacion_id,
        })
    return historial
