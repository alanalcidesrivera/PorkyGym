# api/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Usuario,Socio,PlanMembresia,Venta,Producto,Ejercicio,Rutina,Bitacora,MetodoPago,ContratoMembresia
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
    password = serializers.CharField(
        write_only=True,
        required=False
    )

    password2 = serializers.CharField(
        write_only=True,
        required=False
    )

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

            'password',
            'password2',
        ]

    def validate(self, attrs):
        password = attrs.get('password')
        password2 = attrs.get('password2')

        # Si estamos creando usuario, la contraseña es obligatoria
        if self.instance is None:
            if not password:
                raise serializers.ValidationError({
                    'password': 'La contraseña es obligatoria.'
                })

            if not password2:
                raise serializers.ValidationError({
                    'password2': 'Debe confirmar la contraseña.'
                })

        # Si se ingresó contraseña, ambas deben coincidir
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
    class Meta:
        model = Socio
        fields = '__all__'

class PlanMembresiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanMembresia
        fields = '__all__'

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
            import datetime
            metodo_pago, _ = MetodoPago.objects.get_or_create(descripcion='Efectivo')
            hoy = datetime.date.today()
            contrato = ContratoMembresia.objects.create(
                id_socio=socio,
                id_metodo_pago=metodo_pago,
                id_plan_mem=plan,
                tipo_operacion='Alta',
                fecha_inicio=hoy,
                fecha_vencimiento=hoy + datetime.timedelta(days=plan.duracion_dias),
                monto_pagado_local=plan.costo_base_origen,
                estado_membresia='Activa',
            )

        return {'usuario': usuario, 'socio': socio, 'contrato': contrato}