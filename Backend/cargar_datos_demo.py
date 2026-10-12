"""
Carga de datos de demostración (idempotente).

Rellena el sistema con datos realistas para poder recorrer los CU17–CU20
(Ejercicios, Rutinas, Asignar rutina y Entrenadores) apenas se inicia el
proyecto, sin tener que crear todo a mano desde la interfaz.

Uso:
    cd Backend
    .\\venv\\Scripts\\python.exe manage.py shell -c "exec(open('cargar_datos_demo.py', encoding='utf-8').read())"

Se puede ejecutar tantas veces como se quiera: lo que ya existe no se duplica.

Cuentas que crea:
    admin        / PorkyGym2026!   (Administrador)
    entrenador   / PorkyGym2026!   (Entrenador, con horarios)
    socio        / PorkyGym2026!   (Socio con membresía vigente)
"""
from datetime import date

from django.contrib.auth import get_user_model

from api.models import (
    DetalleRutina,
    Entrenador,
    Ejercicio,
    HorarioEntrenador,
    PlanMembresia,
    Rutina,
    Socio,
    Turno,
)
from api.membresias import crear_contrato_pagado, metodo_pago_por_defecto, resumen_membresia

User = get_user_model()
CLAVE = 'PorkyGym2026!'


def usuario(username, ci, *, es_admin=False, es_entrenador=False, es_socio=False, email=''):
    """Cuenta de acceso (solo se crea si todavía no existe)."""
    obj = User.objects.filter(username=username).first()
    if obj:
        return obj
    obj = User(
        username=username,
        ci=ci,
        email=email,
        es_administrador=es_admin,
        es_entrenador=es_entrenador,
        es_socio=es_socio,
        estado_cuenta='Activo',
    )
    obj.set_password(CLAVE)
    obj.save()
    print(f'  + cuenta {username}')
    return obj


# ---------------------------------------------------------------------------
# 1. Cuentas
# ---------------------------------------------------------------------------
print('1/5 Cuentas de acceso')
usuario('admin', '0000000', es_admin=True)
usuario('entrenador', '1111111', es_entrenador=True, email='entrenador@porkygym.com')
cuenta_socio = usuario('socio', '2222222', es_socio=True, email='socio@porkygym.com')

# ---------------------------------------------------------------------------
# 2. Turnos (los usa el CU20 para los horarios del entrenador)
# ---------------------------------------------------------------------------
print('2/5 Turnos')
turnos = {}
for nombre, inicio, fin in (
    ('Mañana', '07:00', '12:00'),
    ('Tarde', '14:00', '19:00'),
    ('Noche', '19:00', '22:00'),
):
    turno, creado = Turno.objects.get_or_create(
        nombre_turno=nombre, defaults={'hora_inicio': inicio, 'hora_fin': fin}
    )
    turnos[nombre] = turno
    if creado:
        print(f'  + turno {nombre}')

# ---------------------------------------------------------------------------
# 3. Catálogo de ejercicios (CU17)
# ---------------------------------------------------------------------------
print('3/5 Ejercicios')
EJERCICIOS = [
    # (nombre, grupo, equipo, zona)
    ('Press de banca con barra', 'Pecho', 'Barra', 'Zona de pesas libres'),
    ('Press inclinado con mancuernas', 'Pecho', 'Mancuernas', 'Zona de pesas libres'),
    ('Dominadas agarre prono', 'Espalda', 'Barra de dominadas', 'Zona funcional'),
    ('Remo con barra', 'Espalda', 'Barra', 'Zona de pesas libres'),
    ('Press militar con barra', 'Hombros', 'Barra', 'Zona de pesas libres'),
    ('Curl de bíceps con mancuerna', 'Brazos', 'Mancuernas', 'Zona de pesas libres'),
    ('Extensión de tríceps en polea', 'Brazos', 'Polea', 'Zona de máquinas'),
    ('Sentadilla con barra', 'Piernas', 'Barra', 'Zona de pesas libres'),
    ('Prensa de piernas', 'Piernas', 'Máquina', 'Zona de máquinas'),
    ('Peso muerto rumano', 'Gluteos', 'Barra', 'Zona de pesas libres'),
    ('Plancha abdominal', 'Abdomen', 'Colchoneta', 'Zona funcional'),
    ('Circuito de movilidad', 'Cuerpo completo', 'Colchoneta', 'Zona funcional'),
]
for nombre, grupo, equipo, zona in EJERCICIOS:
    _, creado = Ejercicio.objects.get_or_create(
        nombre_ejercicio=nombre,
        defaults={
            'grupo_muscular': grupo,
            'equipo_requerido': equipo,
            'zona_ubicacion': zona,
            'estado': 'Activo',
        },
    )
    if creado:
        print(f'  + {nombre} ({grupo})')

# ---------------------------------------------------------------------------
# 4. Rutinas con su plan de ejercicios (CU18)
# ---------------------------------------------------------------------------
print('4/5 Rutinas')
RUTINAS = [
    {
        'nombre_rutina': 'Full Body Principiante',
        'nivel': 'Principiante',
        'descripcion': 'Tres sesiones por semana, ejercicios compuestos y cargas moderadas.',
        'calorias_estimadas': 350,
        'duracion_estimada_mins': 45,
        'plan': [
            ('Sentadilla con barra', 3, 12, '1.50'),
            ('Press de banca con barra', 3, 10, '1.50'),
            ('Remo con barra', 3, 12, '1.50'),
            ('Plancha abdominal', 3, 40, '1.00'),
        ],
    },
    {
        'nombre_rutina': 'Hipertrofia Tren Superior',
        'nivel': 'Intermedio',
        'descripcion': 'Volumen alto para pecho, espalda y brazos con descansos cortos.',
        'calorias_estimadas': 420,
        'duracion_estimada_mins': 60,
        'plan': [
            ('Press inclinado con mancuernas', 4, 10, '1.50'),
            ('Dominadas agarre prono', 4, 8, '2.00'),
            ('Press militar con barra', 4, 10, '1.50'),
            ('Curl de bíceps con mancuerna', 3, 12, '1.00'),
            ('Extensión de tríceps en polea', 3, 12, '1.00'),
        ],
    },
]
for datos in RUTINAS:
    plan = datos['plan']
    rutina, creado = Rutina.objects.get_or_create(
        nombre_rutina=datos['nombre_rutina'],
        defaults={clave: valor for clave, valor in datos.items() if clave != 'plan'},
    )
    if not creado:
        continue

    for posicion, (nombre_ejercicio, series, reps, descanso) in enumerate(plan, start=1):
        ejercicio = Ejercicio.objects.filter(nombre_ejercicio=nombre_ejercicio).first()
        if not ejercicio:
            continue
        DetalleRutina.objects.create(
            id_rutina=rutina,
            id_ejercicio=ejercicio,
            orden=posicion,
            series=series,
            repeticiones=reps,
            descanso_minutos=descanso,
        )
    print(f'  + {rutina.nombre_rutina} ({rutina.detalles.count()} ejercicios)')

# ---------------------------------------------------------------------------
# 5. Entrenador con horarios (CU20) y socio con membresía vigente (para CU19)
# ---------------------------------------------------------------------------
print('5/5 Entrenador y socio')
cuenta_entrenador = User.objects.get(username='entrenador')
perfil, creado = Entrenador.objects.get_or_create(
    id_entrenador=cuenta_entrenador,
    defaults={
        'especialidad': 'Hipertrofia y fuerza',
        'certificado': 'Trainer certificado nivel 2',
        'biografia_profesional': '8 años de experiencia acompañando a socios '
                                 'en rutinas de fuerza y recomposición corporal.',
        'anios_experiencia': 8,
        'estado': 'Activo',
    },
)
if creado:
    print('  + perfil de entrenador')
    for dia, turno in (('Lunes', 'Mañana'), ('Miercoles', 'Tarde'), ('Viernes', 'Mañana')):
        HorarioEntrenador.objects.get_or_create(
            id_entrenador=perfil, id_turno=turnos[turno], dia_semana=dia
        )
    print('  + 3 horarios (L/Mi/V)')

socio, creado = Socio.objects.get_or_create(
    id_socio=cuenta_socio,
    defaults={'fecha_nacimiento': date(1995, 6, 15)},
)
if creado:
    print('  + expediente de socio')

# El CU19 exige membresía vigente: se crea el plan y el contrato solo si falta.
if resumen_membresia(socio)['estado'] != 'Vigente':
    plan, _ = PlanMembresia.objects.get_or_create(
        nombre_plan='Plan Mensual',
        defaults={
            'costo_base_origen': 150,
            'duracion_dias': 30,
            'acceso_piscina': True,
            'clases_grupales': True,
            'estado': 'Activo',
        },
    )
    crear_contrato_pagado(socio=socio, plan=plan, metodo_pago=metodo_pago_por_defecto())
    print(f'  + contrato vigente sobre "{plan.nombre_plan}"')

print()
print('Datos de demostración listos.')
print(f'  Ejercicios: {Ejercicio.objects.count()} | Rutinas: {Rutina.objects.count()} '
      f'| Entrenadores: {Entrenador.objects.count()} | Socios: {Socio.objects.count()}')
