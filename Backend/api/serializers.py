# api/serializers.py
from datetime import date
from decimal import Decimal

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from .models import (
    Usuario, Socio, PlanMembresia, Venta, Producto, Ejercicio, Rutina,
    Bitacora, MetodoPago, ContratoMembresia,
    DetalleRutina, AsignacionRutina, Entrenador, HorarioEntrenador, Turno,
    GRUPOS_MUSCULARES, NIVELES_RUTINA, DIAS_SEMANA,
)
from .membresias import (
    crear_contrato_pagado,
    historial_contratos,
    metodo_pago_por_defecto,
    resumen_membresia,
    validar_pago_exacto,
)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

Usuario = get_user_model()

class RegistroUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Usuario
        fields = ['username', 'email', 'password', 'password2', 'ci', 'telefono', 'es_socio', 'es_entrenador', 'es_recepcionista', 'es_administrador']

    def validate(self, attrs):
        # Las contraseñas deben coincidir
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({'password2': 'Las contraseñas no coinciden.'})
        return attrs

    def validate_password(self, value):
        # Requisitos estrictos se aplican AL REGISTRARSE (mismos que en el reset)
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        # create_user hashea la contraseña automáticamente (PBKDF2 + salt)
        validated_data.pop('password2', None)
        user = Usuario.objects.create_user(**validated_data)
        return user


class UsuarioSerializer(serializers.ModelSerializer):
    # CU01 (edición): la contraseña es opcional al actualizar. Se acepta el
    # campo vacío y se interpreta como "no cambiar la contraseña"; al crear,
    # la validación sigue exigiéndola (no se debilitan las cuentas nuevas).
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

    password2 = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

    # Resumen de membresía del socio (solo lectura). Es ``null`` para las
    # cuentas que no son socios o que aún no tienen expediente de socio, de
    # modo que no se presenta como si fuera una propiedad de todo usuario.
    membresia = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'email',
            'ci',
            'telefono',
            'estado_cuenta',

            'es_socio',
            'es_entrenador',
            'es_recepcionista',
            'es_administrador',

            'membresia',

            'password',
            'password2',
        ]

    def get_membresia(self, obj):
        if not obj.es_socio:
            return None
        socio = getattr(obj, 'socio', None)
        if socio is None:
            return None
        return resumen_membresia(socio)

    def validate(self, attrs):
        # Edición (CU01): un campo de contraseña vacío u omitido significa
        # "no modificar la contraseña actual". Se normaliza a ausente para no
        # guardar nunca una contraseña en blanco ni reescribir la existente.
        if attrs.get('password') in ('', None):
            attrs.pop('password', None)
        if attrs.get('password2') in ('', None):
            attrs.pop('password2', None)

        password = attrs.get('password')
        password2 = attrs.get('password2')

        # Al CREAR la contraseña sigue siendo obligatoria (se mantienen los
        # requisitos de seguridad para las cuentas nuevas).
        if self.instance is None:
            if not password:
                raise serializers.ValidationError({
                    'password': 'La contraseña es obligatoria.'
                })

            if not password2:
                raise serializers.ValidationError({
                    'password2': 'Debe confirmar la contraseña.'
                })

        # Si se ingresó contraseña, ambas deben coincidir y cumplir la
        # política de complejidad existente.
        if password or password2:
            if password != password2:
                raise serializers.ValidationError({
                    'password2': 'Las contraseñas no coinciden.'
                })

            try:
                validate_password(password)
            except ValidationError as e:
                raise serializers.ValidationError({
                    'password': list(e.messages)
                })

        # CU04: el rol de socio no se administra desde "Gestionar usuarios",
        # porque ese flujo no crea el expediente Socio (fecha de nacimiento,
        # etc.). El alta correcta es "Registrar nuevo socio", que usa otro
        # serializador y sí crea/víncula la cuenta con su expediente.
        es_socio = attrs.get('es_socio')
        if es_socio:
            if self.instance is None:
                raise serializers.ValidationError({
                    'es_socio': 'El rol de socio no se asigna desde '
                                '"Gestionar usuarios". Use "Registrar nuevo '
                                'socio" para crear la cuenta y su expediente.'
                })
            # En edición solo se permite conservar el rol de socio si la
            # cuenta ya es socio o ya tiene expediente Socio. Así no se
            # bloquea la edición legítima de cuentas existentes ni se alteran
            # datos históricos, pero se evitan nuevas inconsistencias.
            if not (self.instance.es_socio or hasattr(self.instance, 'socio')):
                raise serializers.ValidationError({
                    'es_socio': 'No se puede asignar el rol de socio a una '
                                'cuenta sin expediente de socio. Use '
                                '"Registrar nuevo socio".'
                })

        return attrs

    def create(self, validated_data):
        validated_data.pop('password2', None)
        password = validated_data.pop('password')

        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()

        return user

    def update(self, instance, validated_data):
        validated_data.pop('password2', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()

        return instance
    
class LoginSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)
        
        usuario = self.user
        if usuario.estado_cuenta != 'Activo':
           raise serializers.ValidationError({
           'detail': 'La cuenta está desactivada. Contacte con el administrador.'
         })
        data['usuario'] = {
            'id': usuario.id,
            'username': usuario.username,
            'email': usuario.email,
            'estado_cuenta': usuario.estado_cuenta,

            'es_socio': usuario.es_socio,
            'es_entrenador': usuario.es_entrenador,
            'es_recepcionista': usuario.es_recepcionista,
            'es_administrador': usuario.es_administrador,

            'is_superuser': usuario.is_superuser,
        }

        return data
class SocioSerializer(serializers.ModelSerializer):
    # Campos legibles del socio (desde su cuenta Usuario) para los selectores
    # del frontend (CU06). Solo lectura: no afectan el alta (CU04).
    username = serializers.CharField(source='id_socio.username', read_only=True)
    ci = serializers.CharField(source='id_socio.ci', read_only=True)
    estado_cuenta = serializers.CharField(source='id_socio.estado_cuenta', read_only=True)

    # Consulta de vigencia e historial de membresía (solo lectura, CU06).
    membresia = serializers.SerializerMethodField()
    historial_contratos = serializers.SerializerMethodField()

    class Meta:
        model = Socio
        fields = '__all__'

    def get_membresia(self, obj):
        return resumen_membresia(obj)

    def get_historial_contratos(self, obj):
        return historial_contratos(obj)

class PlanMembresiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanMembresia
        fields = [
            'id_plan_membresia',
            'nombre_plan',
            'moneda_origen',
            'costo_base_origen',
            'duracion_dias',
            'acceso_piscina',
            'clases_grupales',
            'estado',
        ]
        read_only_fields = ['id_plan_membresia']

    def validate_nombre_plan(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('El nombre del plan es obligatorio.')
        return value

    def validate_costo_base_origen(self, value):
        if value is None:
            raise serializers.ValidationError('El costo base es obligatorio.')
        if value < 0:
            raise serializers.ValidationError('El costo base no puede ser negativo.')
        return value

    def validate_duracion_dias(self, value):
        if value is None:
            raise serializers.ValidationError('La duración en días es obligatoria.')
        if value < 1:
            raise serializers.ValidationError('La duración debe ser al menos 1 día.')
        return value

class MetodoPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetodoPago
        fields = ['id_metodo_pago', 'descripcion']


class TurnoSerializer(serializers.ModelSerializer):
    """Catálogo de franjas horarias (CU20: horarios del entrenador)."""

    class Meta:
        model = Turno
        fields = ['id_turno', 'nombre_turno', 'hora_inicio', 'hora_fin']


class ContratoMembresiaSerializer(serializers.ModelSerializer):
    """Lectura de un contrato de membresía (respuesta del registro, CU06)."""
    socio_username = serializers.SerializerMethodField()
    socio_ci = serializers.SerializerMethodField()
    plan_nombre = serializers.CharField(source='id_plan_mem.nombre_plan', read_only=True)
    plan_estado = serializers.CharField(source='id_plan_mem.estado', read_only=True)
    metodo_pago = serializers.CharField(source='id_metodo_pago.descripcion', read_only=True)

    # Vigencia derivada (no se almacena): 'Vigente' / 'Vencida' / 'Pendiente'.
    vigencia = serializers.SerializerMethodField()
    dias_restantes = serializers.SerializerMethodField()

    class Meta:
        model = ContratoMembresia
        fields = [
            'id_contrato_mem',
            'id_socio',
            'socio_username',
            'socio_ci',
            'id_plan_mem',
            'plan_nombre',
            'plan_estado',
            'id_metodo_pago',
            'metodo_pago',
            'id_renovacion',
            'tipo_operacion',
            'fecha_inicio',
            'fecha_vencimiento',
            'tasa_cambio_aplicada',
            'monto_pagado_local',
            'estado_membresia',
            'vigencia',
            'dias_restantes',
        ]

    def get_socio_username(self, obj):
        return obj.id_socio.id_socio.username

    def get_socio_ci(self, obj):
        return obj.id_socio.id_socio.ci

    def get_vigencia(self, obj):
        if obj.estado_membresia != 'Activa':
            return obj.estado_membresia
        if obj.fecha_vencimiento > date.today():
            return 'Vigente'
        return 'Vencida'

    def get_dias_restantes(self, obj):
        if obj.estado_membresia != 'Activa':
            return None
        if obj.fecha_vencimiento > date.today():
            return (obj.fecha_vencimiento - date.today()).days
        return 0


class RegistrarContratoMembresiaSerializer(serializers.Serializer):
    """CU06: Registra un contrato de membresía para un socio existente.

    Reglas de negocio:
    - Solo se aceptan planes activos.
    - El pago debe ser **exactamente** el precio del plan (no hay pagos
      parciales). El estado resultante es siempre 'Activa'.
    - El periodo se calcula de forma acumulativa (ver ``api.membresias``): si
      el socio tiene vigencia pagada, el nuevo contrato empieza al vencer la
      anterior; si no, empieza hoy.
    - El servidor determina la fecha de inicio, el vencimiento, el tipo de
      operación y el ``id_renovacion``; no se aceptan desde el cliente.
    """
    id_socio = serializers.PrimaryKeyRelatedField(queryset=Socio.objects.all())
    id_plan_membresia = serializers.PrimaryKeyRelatedField(
        queryset=PlanMembresia.objects.all()
    )
    id_metodo_pago = serializers.PrimaryKeyRelatedField(queryset=MetodoPago.objects.all())
    monto_pagado_local = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.01')
    )

    def validate_id_plan_membresia(self, plan):
        if plan.estado != 'Activo':
            raise serializers.ValidationError(
                'Solo se pueden seleccionar planes activos.'
            )
        return plan

    def validate_monto_pagado_local(self, value):
        if value is None:
            raise serializers.ValidationError('El monto pagado es obligatorio.')
        if value < 0:
            raise serializers.ValidationError('El monto pagado no puede ser negativo.')
        return value

    def validate(self, attrs):
        plan = attrs.get('id_plan_membresia')
        monto = attrs.get('monto_pagado_local')
        if plan is not None and monto is not None:
            # Pago exacto (ni menor, ni mayor, ni negativo, ni inválido).
            try:
                validar_pago_exacto(monto, plan)
            except ValidationError as error:
                raise serializers.ValidationError(
                    {'monto_pagado_local': list(error.messages)}
                )
        return attrs

    def create(self, validated_data):
        return crear_contrato_pagado(
            socio=validated_data['id_socio'],
            plan=validated_data['id_plan_membresia'],
            metodo_pago=validated_data['id_metodo_pago'],
        )

class VentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venta
        fields = '__all__'

class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = '__all__'

# ============================================================
# CU17: REGISTRAR EJERCICIO
# ============================================================
class EjercicioSerializer(serializers.ModelSerializer):
    """Alta y edición de ejercicios del catálogo del gimnasio.

    Reglas de negocio:
    - El nombre es obligatorio y no puede repetirse dentro del mismo grupo
      muscular (evita duplicados como "Press de banca" / "press banca").
    - El grupo muscular se valida contra el catálogo ``GRUPOS_MUSCULARES``.
    - El video es opcional, pero si se informa debe ser una URL válida.
    """

    class Meta:
        model = Ejercicio
        fields = [
            'id_ejercicio',
            'nombre_ejercicio',
            'grupo_muscular',
            'equipo_requerido',
            'zona_ubicacion',
            'url_video_tecnica',
            'descripcion_tecnica',
            'estado',
        ]
        read_only_fields = ['id_ejercicio']

    def validate_nombre_ejercicio(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('El nombre del ejercicio es obligatorio.')
        return value

    def validate_grupo_muscular(self, value):
        if not value:
            raise serializers.ValidationError('Debe indicar el grupo muscular.')
        validos = dict(GRUPOS_MUSCULARES).keys()
        if value not in validos:
            raise serializers.ValidationError(
                f'Grupo muscular inválido. Opciones: {", ".join(sorted(validos))}.'
            )
        return value

    def validate_url_video_tecnica(self, value):
        if not value:
            return value
        value = value.strip()
        if not value.lower().startswith(('http://', 'https://')):
            raise serializers.ValidationError('El video debe ser una URL http(s) válida.')
        return value

    def validate(self, attrs):
        nombre = (attrs.get('nombre_ejercicio') or '').strip().lower()
        grupo = attrs.get('grupo_muscular')
        # En edición se excluye el propio registro del control de duplicados.
        excluido = self.instance.pk if self.instance else None
        duplicado = (
            Ejercicio.objects.filter(nombre_ejercicio__iexact=nombre, grupo_muscular=grupo)
            .exclude(pk=excluido)
            .exists()
        )
        if duplicado:
            raise serializers.ValidationError({
                'nombre_ejercicio': f'Ya existe un ejercicio "{attrs.get("nombre_ejercicio")}" '
                                    f'en el grupo muscular "{grupo}".'
            })
        return attrs


class EjercicioListSerializer(serializers.ModelSerializer):
    """Lectura del catálogo (lista y detalle)."""
    en_rutinas = serializers.IntegerField(read_only=True)

    class Meta:
        model = Ejercicio
        fields = [
            'id_ejercicio',
            'nombre_ejercicio',
            'grupo_muscular',
            'equipo_requerido',
            'zona_ubicacion',
            'url_video_tecnica',
            'descripcion_tecnica',
            'estado',
            'en_rutinas',
        ]


# ============================================================
# CU18: DISEÑAR RUTINA DE ENTRENAMIENTO
# ============================================================
class DetalleRutinaSerializer(serializers.ModelSerializer):
    """Fila de la rutina: ejercicio + series + repeticiones + descanso."""

    id_ejercicio = serializers.PrimaryKeyRelatedField(queryset=Ejercicio.objects.all())
    nombre_ejercicio = serializers.CharField(source='id_ejercicio.nombre_ejercicio', read_only=True)
    grupo_muscular = serializers.CharField(source='id_ejercicio.grupo_muscular', read_only=True)

    class Meta:
        model = DetalleRutina
        fields = [
            'id_ejercicio',
            'nombre_ejercicio',
            'grupo_muscular',
            'orden',
            'series',
            'repeticiones',
            'descanso_minutos',
        ]

    def validate_id_ejercicio(self, ejercicio):
        if ejercicio.estado != 'Activo':
            raise serializers.ValidationError('Solo se pueden usar ejercicios activos.')
        return ejercicio

    def validate(self, attrs):
        if attrs.get('series', 1) < 1:
            raise serializers.ValidationError({'series': 'Las series deben ser al menos 1.'})
        if attrs.get('repeticiones', 1) < 1:
            raise serializers.ValidationError({'repeticiones': 'Las repeticiones deben ser al menos 1.'})
        descanso = attrs.get('descanso_minutos')
        if descanso is not None and descanso < 0:
            raise serializers.ValidationError({'descanso_minutos': 'El descanso no puede ser negativo.'})
        return attrs


class RutinaSerializer(serializers.ModelSerializer):
    """Lectura de una rutina CON su plan de ejercicios ya resuelto."""

    detalles = DetalleRutinaSerializer(many=True, read_only=True)
    total_ejercicios = serializers.SerializerMethodField()
    total_series = serializers.SerializerMethodField()

    class Meta:
        model = Rutina
        fields = [
            'id_rutina',
            'nombre_rutina',
            'nivel',
            'descripcion',
            'calorias_estimadas',
            'duracion_estimada_mins',
            'estado',
            'detalles',
            'total_ejercicios',
            'total_series',
        ]
        read_only_fields = ['id_rutina']

    def get_total_ejercicios(self, obj):
        return obj.detalles.count()

    def get_total_series(self, obj):
        return sum(detalle.series for detalle in obj.detalles.all())


class RutinaConDetallesSerializer(serializers.Serializer):
    """CU18: crea/actualiza la rutina JUNTO CON sus ejercicios, en una sola petición.

    El cliente envía un único JSON con la cabecera de la rutina y la lista
    ``ejercicios``. El servidor valida que:
    - haya al menos un ejercicio,
    - no haya ejercicios repetidos dentro de la rutina,
    - todos los ejercicios estén activos.
    La escritura es atómica: si algo falla, no se guarda nada.
    """

    nombre_rutina = serializers.CharField(max_length=100)
    nivel = serializers.ChoiceField(choices=NIVELES_RUTINA, default='Principiante')
    descripcion = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    calorias_estimadas = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    duracion_estimada_mins = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    ejercicios = DetalleRutinaSerializer(many=True)

    def validate_nombre_rutina(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('El nombre de la rutina es obligatorio.')
        excluido = self.instance.pk if self.instance else None
        if Rutina.objects.filter(nombre_rutina__iexact=value).exclude(pk=excluido).exists():
            raise serializers.ValidationError('Ya existe una rutina con ese nombre.')
        return value

    def validate_ejercicios(self, ejercicios):
        if not ejercicios:
            raise serializers.ValidationError('La rutina debe incluir al menos un ejercicio.')

        vistos = set()
        for detalle in ejercicios:
            clave = detalle['id_ejercicio'].pk
            if clave in vistos:
                raise serializers.ValidationError(
                    f'El ejercicio "{detalle["id_ejercicio"].nombre_ejercicio}" está repetido '
                    'dentro de la rutina.'
                )
            vistos.add(clave)
        return ejercicios

    def create(self, validated_data):
        detalles = validated_data.pop('ejercicios')
        with transaction.atomic():
            rutina = Rutina.objects.create(**validated_data)
            DetalleRutina.objects.bulk_create([
                DetalleRutina(
                    id_rutina=rutina,
                    id_ejercicio=detalle['id_ejercicio'],
                    orden=detalle.get('orden') or posicion + 1,
                    series=detalle['series'],
                    repeticiones=detalle['repeticiones'],
                    descanso_minutos=detalle.get('descanso_minutos'),
                )
                for posicion, detalle in enumerate(detalles)
            ])
        return rutina

    def update(self, instance, validated_data):
        detalles = validated_data.pop('ejercicios')
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            # Se reconstruye el plan completo (alta/edición/baja de ejercicios
            # en una sola operación) respetando el orden recibido.
            instance.detalles.all().delete()
            DetalleRutina.objects.bulk_create([
                DetalleRutina(
                    id_rutina=instance,
                    id_ejercicio=detalle['id_ejercicio'],
                    orden=detalle.get('orden') or posicion + 1,
                    series=detalle['series'],
                    repeticiones=detalle['repeticiones'],
                    descanso_minutos=detalle.get('descanso_minutos'),
                )
                for posicion, detalle in enumerate(detalles)
            ])
        return instance


# ============================================================
# CU19: ASIGNAR RUTINA A SOCIO
# ============================================================
class AsignacionRutinaSerializer(serializers.ModelSerializer):
    """Asocia una rutina existente a un socio con membresía vigente.

    Reglas de negocio:
    - El socio debe tener la cuenta activa.
    - El socio debe tener membresía **Vigente** (se reutiliza
      ``resumen_membresia`` para no duplicar criterios de vigencia).
    - La rutina debe estar activa.
    - No se puede asignar dos veces la misma rutina activa al mismo socio.
    """

    socio_username = serializers.CharField(source='id_socio.id_socio.username', read_only=True)
    socio_ci = serializers.CharField(source='id_socio.id_socio.ci', read_only=True)
    rutina_nombre = serializers.CharField(source='id_rutina.nombre_rutina', read_only=True)
    entrenador_username = serializers.CharField(source='id_entrenador.id_entrenador.username', read_only=True)
    membresia = serializers.SerializerMethodField()

    # Opcional: si el cliente no lo envía, la vista firma la asignación con
    # el perfil de Entrenador del usuario autenticado.
    id_entrenador = serializers.PrimaryKeyRelatedField(
        queryset=Entrenador.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = AsignacionRutina
        fields = [
            'id_asignacion_rutina',
            'id_socio',
            'socio_username',
            'socio_ci',
            'id_rutina',
            'rutina_nombre',
            'id_entrenador',
            'entrenador_username',
            'fecha_asignacion',
            'fecha_inicio',
            'fecha_fin',
            'observaciones',
            'estado',
            'membresia',
        ]
        read_only_fields = ['id_asignacion_rutina', 'fecha_asignacion']

    def get_membresia(self, obj):
        return resumen_membresia(obj.id_socio)

    def validate(self, attrs):
        socio = attrs.get('id_socio')
        rutina = attrs.get('id_rutina')

        if socio is not None:
            if socio.id_socio.estado_cuenta != 'Activo':
                raise serializers.ValidationError({
                    'id_socio': 'El socio tiene la cuenta desactivada; no puede recibir rutinas.'
                })

            membresia = resumen_membresia(socio)
            if membresia['estado'] != 'Vigente':
                raise serializers.ValidationError({
                    'id_socio': f'El socio no puede recibir rutinas: su membresía está '
                                f'"{membresia["estado"]}". Renueve la membresía (CU06) primero.'
                })

        if rutina is not None and rutina.estado != 'Activo':
            raise serializers.ValidationError({
                'id_rutina': 'Solo se pueden asignar rutinas activas.'
            })

        # Evita duplicar la misma rutina vigente para el mismo socio.
        if self.instance is None and socio is not None and rutina is not None:
            duplicada = (
                AsignacionRutina.objects
                .filter(id_socio=socio, id_rutina=rutina, estado='Activa')
                .exists()
            )
            if duplicada:
                raise serializers.ValidationError({
                    'id_rutina': f'La rutina "{rutina.nombre_rutina}" ya está asignada '
                                 'y activa para este socio.'
                })

        return attrs


# ============================================================
# CU20: GESTIONAR PERFIL DE ENTRENADOR
# ============================================================
class HorarioEntrenadorSerializer(serializers.ModelSerializer):
    """Disponibilidad semanal del entrenador (día + turno del catálogo)."""

    dia_semana_display = serializers.CharField(source='get_dia_semana_display', read_only=True)
    turno_nombre = serializers.CharField(source='id_turno.nombre_turno', read_only=True)
    hora_inicio = serializers.TimeField(source='id_turno.hora_inicio', read_only=True)
    hora_fin = serializers.TimeField(source='id_turno.hora_fin', read_only=True)

    class Meta:
        model = HorarioEntrenador
        fields = [
            'id_horario_entrenador',
            'id_turno',
            'turno_nombre',
            'dia_semana',
            'dia_semana_display',
            'hora_inicio',
            'hora_fin',
        ]
        read_only_fields = ['id_horario_entrenador']

    def validate_dia_semana(self, value):
        validos = dict(DIAS_SEMANA).keys()
        if value not in validos:
            raise serializers.ValidationError(f'Día inválido. Opciones: {", ".join(sorted(validos))}.')
        return value


class EntrenadorSerializer(serializers.ModelSerializer):
    """Perfil del entrenador: datos personales + especialidad + horarios.

    Los campos de la cuenta (username, email, ci, teléfono) se leen desde el
    ``Usuario`` relacionado y son de solo lectura aquí; la gestión de la
    contraseña queda en el módulo de usuarios (CU01).
    """

    username = serializers.CharField(source='id_entrenador.username', read_only=True)
    email = serializers.EmailField(source='id_entrenador.email', read_only=True)
    ci = serializers.CharField(source='id_entrenador.ci', read_only=True)
    telefono = serializers.CharField(source='id_entrenador.telefono', read_only=True)
    estado_cuenta = serializers.CharField(source='id_entrenador.estado_cuenta', read_only=True)
    horarios = HorarioEntrenadorSerializer(many=True, read_only=True)

    class Meta:
        model = Entrenador
        fields = [
            'id_entrenador',
            'username',
            'email',
            'ci',
            'telefono',
            'estado_cuenta',
            'especialidad',
            'certificado',
            'biografia_profesional',
            'anios_experiencia',
            'red_social_link',
            'estado',
            'horarios',
        ]
        read_only_fields = ['id_entrenador']


class RegistrarEntrenadorSerializer(serializers.Serializer):
    """CU20: alta completa de entrenador (cuenta + perfil + horarios).

    Crea la ``Usuario`` con el rol ``es_entrenador`` y su perfil ``Entrenador``
    en la misma operación atómica, replicando el patrón de CU04 (Registrar
    Socio). Los horarios se reciben como lista opcional de
    ``{id_turno, dia_semana}``.
    """

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    ci = serializers.CharField(max_length=20)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    especialidad = serializers.CharField(max_length=100, required=False, allow_blank=True)
    certificado = serializers.CharField(max_length=100, required=False, allow_blank=True)
    biografia_profesional = serializers.CharField(required=False, allow_blank=True)
    anios_experiencia = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    red_social_link = serializers.CharField(max_length=255, required=False, allow_blank=True)

    horarios = HorarioEntrenadorSerializer(many=True, required=False)

    def validate_username(self, value):
        if Usuario.objects.filter(username=value).exists():
            raise serializers.ValidationError('Ese nombre de usuario ya existe.')
        return value

    def validate_ci(self, value):
        if Usuario.objects.filter(ci=value).exists():
            raise serializers.ValidationError('Ya existe una persona registrada con ese CI.')
        return value

    def validate_horarios(self, horarios):
        vistos = set()
        for horario in horarios:
            clave = (horario['id_turno'].pk, horario['dia_semana'])
            if clave in vistos:
                raise serializers.ValidationError(
                    f'El turno {horario["id_turno"].nombre_turno} del '
                    f'{horario["dia_semana"]} está duplicado.'
                )
            vistos.add(clave)
        return horarios

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({'password2': 'Las contraseñas no coinciden.'})
        try:
            validate_password(attrs.get('password'))
        except ValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        return attrs

    def create(self, validated_data):
        horarios = validated_data.pop('horarios', [])
        validated_data.pop('password2', None)
        password = validated_data.pop('password')

        with transaction.atomic():
            usuario = Usuario.objects.create_user(
                username=validated_data['username'],
                email=validated_data.get('email', ''),
                ci=validated_data['ci'],
                telefono=validated_data.get('telefono', ''),
                es_entrenador=True,
                password=password,
            )

            entrenador = Entrenador.objects.create(
                id_entrenador=usuario,
                especialidad=validated_data.get('especialidad', ''),
                certificado=validated_data.get('certificado', ''),
                biografia_profesional=validated_data.get('biografia_profesional', ''),
                anios_experiencia=validated_data.get('anios_experiencia'),
                red_social_link=validated_data.get('red_social_link', ''),
            )

            HorarioEntrenador.objects.bulk_create([
                HorarioEntrenador(
                    id_entrenador=entrenador,
                    id_turno=horario['id_turno'],
                    dia_semana=horario['dia_semana'],
                )
                for horario in horarios
            ])

        return entrenador


# ============================================================
# CU03: Registrar Bitácora de Auditoría
# ============================================================
class BitacoraSerializer(serializers.ModelSerializer):
    usuario_username = serializers.SerializerMethodField()

    class Meta:
        model = Bitacora
        fields = [
            'id_bitacora',
            'id_usuario',
            'usuario_username',
            'nombre_usuario_db',
            'accion',
            'tabla_afectada',
            'descripcion',
            'direccion_ip',
            'fecha_hora',
        ]
        read_only_fields = fields

    def get_usuario_username(self, obj):
        if obj.id_usuario_id:
            return obj.id_usuario.username
        return obj.nombre_usuario_db or 'Sistema'


# ============================================================
# CU04: Registrar Expediente de Socio (alta desde Recepción)
# ============================================================
class RegistrarSocioSerializer(serializers.Serializer):
    """Crea la cuenta de Usuario (rol Socio) + su expediente (Socio),
    y opcionalmente asigna un plan de membresía inicial (crea el
    primer ContratoMembresia, ligado a CU06)."""

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    ci = serializers.CharField(max_length=20)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    fecha_nacimiento = serializers.DateField()
    peso_inicial_kg = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    contacto_emerg_nombre = serializers.CharField(
        max_length=150, required=False, allow_blank=True
    )

    id_plan_membresia = serializers.PrimaryKeyRelatedField(
        queryset=PlanMembresia.objects.all(), required=False, allow_null=True
    )

    id_metodo_pago = serializers.PrimaryKeyRelatedField(
        queryset=MetodoPago.objects.all(), required=False, allow_null=True
    )

    def validate_username(self, value):
        if Usuario.objects.filter(username=value).exists():
            raise serializers.ValidationError('Ese nombre de usuario ya existe.')
        return value

    def validate_ci(self, value):
        if Usuario.objects.filter(ci=value).exists():
            raise serializers.ValidationError('Ya existe un socio registrado con ese CI.')
        return value

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({'password2': 'Las contraseñas no coinciden.'})
        try:
            validate_password(attrs.get('password'))
        except ValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        return attrs

    def create(self, validated_data):
        plan = validated_data.pop('id_plan_membresia', None)
        metodo_pago = validated_data.pop('id_metodo_pago', None)
        validated_data.pop('password2', None)
        password = validated_data.pop('password')

        usuario = Usuario.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            ci=validated_data['ci'],
            telefono=validated_data.get('telefono', ''),
            es_socio=True,
            password=password,
        )

        socio = Socio.objects.create(
            id_socio=usuario,
            fecha_nacimiento=validated_data['fecha_nacimiento'],
            peso_inicial_kg=validated_data.get('peso_inicial_kg'),
            contacto_emerg_nombre=validated_data.get('contacto_emerg_nombre', ''),
        )

        contrato = None
        if plan is not None:
            # Membresía inicial con pago completo y método real (Efectivo por
            # defecto si no se indica). Reutiliza la misma lógica que CU06.
            if metodo_pago is None:
                metodo_pago = metodo_pago_por_defecto()
            contrato = crear_contrato_pagado(socio=socio, plan=plan, metodo_pago=metodo_pago)

        return {'usuario': usuario, 'socio': socio, 'contrato': contrato}