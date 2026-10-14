# Semilla del catálogo de turnos (CU20).
#
# El alta de entrenador pide, como requisito, asignar al menos un horario
# compuesto por «día de la semana + turno». Sin filas en la tabla ``turno``
# el selector del formulario queda vacío y el alta no se puede completar.
#
# Esta migración de datos garantiza que siempre existan las cuatro franjas
# del gimnasio (Mañana, Mediodía, Tarde y Noche). Es idempotente: si el turno
# ya fue creado por el script de datos demo o por el administrador desde el
# admin de Django, se conserva tal cual.
from django.db import migrations

TURNOS_BASE = (
    ('Mañana', '07:00', '12:00'),
    ('Mediodía', '12:00', '14:00'),
    ('Tarde', '14:00', '19:00'),
    ('Noche', '19:00', '22:00'),
)


def crear_turnos(apps, schema_editor):
    Turno = apps.get_model('api', 'Turno')
    for nombre, hora_inicio, hora_fin in TURNOS_BASE:
        Turno.objects.get_or_create(
            nombre_turno=nombre,
            defaults={'hora_inicio': hora_inicio, 'hora_fin': hora_fin},
        )


def eliminar_turnos(apps, schema_editor):
    """Reversión blanda: solo borra los turnos que nadie está usando."""
    Turno = apps.get_model('api', 'Turno')
    HorarioEntrenador = apps.get_model('api', 'HorarioEntrenador')
    en_uso = HorarioEntrenador.objects.values_list('id_turno_id', flat=True)
    Turno.objects.filter(
        nombre_turno__in=[nombre for nombre, _, _ in TURNOS_BASE]
    ).exclude(pk__in=list(en_uso)).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_asignacionrutina_turno'),
    ]

    operations = [
        migrations.RunPython(crear_turnos, eliminar_turnos),
    ]
