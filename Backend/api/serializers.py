# api/serializers.py
from datetime import date
from decimal import Decimal

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Usuario,Socio,PlanMembresia,Venta,Producto,Ejercicio,Rutina,Bitacora,MetodoPago,ContratoMembresia
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

class EjercicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ejercicio
        fields = '__all__'

class RutinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rutina
        fields = '__all__'


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