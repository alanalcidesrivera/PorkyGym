# api/views.py
import csv

from django.conf import settings
from axes.models import AccessAttempt
from decouple import config
from rest_framework import status, permissions, viewsets, mixins  # <--- Se agregó viewsets aquí
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.http import HttpResponse
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from .emails import enviar_correo_brevo

from rest_framework.permissions import AllowAny
from .models import Usuario, Socio, PlanMembresia, Venta, Producto, Ejercicio, Rutina, Bitacora
from .serializers import (
    RegistroUsuarioSerializer, UsuarioSerializer, SocioSerializer,
    PlanMembresiaSerializer, VentaSerializer, ProductoSerializer,
    EjercicioSerializer, RutinaSerializer, LoginSerializer,
    BitacoraSerializer, RegistrarSocioSerializer,
)

User = get_user_model()


# ==============================================================================
# CU03: REGISTRAR BITÁCORA DE AUDITORÍA
# Utilidades usadas por el resto de las vistas para dejar rastro de las
# acciones relevantes (login, alta/edición de usuarios, alta de socios, etc.)
# ==============================================================================

def obtener_ip(request):
    """Obtiene la IP real del cliente, considerando proxies (X-Forwarded-For)."""
    if request is None:
        return None
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def registrar_bitacora(request, accion, tabla_afectada, descripcion, usuario=None, nombre_usuario_db=None):
    """Crea una entrada en la bitácora de auditoría (CU03).

    - `usuario`: instancia de Usuario que ejecuta la acción (si hay sesión).
    - `nombre_usuario_db`: texto libre para casos sin usuario autenticado
      (por ejemplo, un intento de login fallido con un username inexistente).
    No debe interrumpir el flujo principal si algo falla (ver excepción de CU03).
    """
    try:
        Bitacora.objects.create(
            id_usuario=usuario,
            nombre_usuario_db=nombre_usuario_db or (usuario.username if usuario else 'Sistema'),
            accion=accion,
            tabla_afectada=tabla_afectada,
            descripcion=descripcion,
            direccion_ip=obtener_ip(request),
        )
    except Exception:
        # El sistema notifica el fallo sin interrumpir la operación principal.
        pass

# 1. Cambiar contraseña cuando está logueado
class CambiarPasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        password_actual = request.data.get('password_actual')
        password_nueva = request.data.get('password_nueva')

        if not user.check_password(password_actual):
            return Response({'error': 'La contraseña actual es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password_nueva, user)
        except ValidationError as e:
            return Response({'error': e.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password_nueva)  # Se encripta automáticamente
        user.save()
        registrar_bitacora(
            request, 'UPDATE', 'usuario',
            f"El usuario '{user.username}' cambió su propia contraseña.",
            usuario=user,
        )
        return Response({'mensaje': 'Contraseña actualizada con éxito.'})

# 2. Solicitar correo de recuperación (Olvidé mi contraseña)
class SolicitarResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        user = User.objects.filter(email=email).first()

        # Por seguridad devolvemos siempre el mismo mensaje genérico
        # (no revelar si el correo existe en el sistema).
        if user is not None and not user.is_active:
            user = None

        if user is not None:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            frontend_url = config('FRONTEND_URL', default='http://localhost:3000').rstrip('/')
            link_recuperacion = f"{frontend_url}/reset-password/{uid}/{token}/"

            asunto = 'Recuperación de contraseña — Porky Gym'
            contenido = (
                '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">'
                f'<h2 style="color:#111">Hola {user.username},</h2>'
                '<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>'
                '<p style="margin:24px 0">'
                f'<a href="{link_recuperacion}" style="background:#E2FF00;color:#111;padding:12px 24px;'
                'text-decoration:none;font-weight:bold;border-radius:4px">'
                'Restablecer mi contraseña</a></p>'
                '<p>Si no solicitaste este cambio, ignora este correo; tu contraseña '
                'seguirá siendo la misma.</p>'
                '<hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>'
                '<p style="color:#777;font-size:12px">Porky Gym • Sistema de gestión</p>'
                '</div>'
            )

            enviado = enviar_correo_brevo(email, asunto, contenido)

            registrar_bitacora(
                request, 'UPDATE', 'usuario',
                f"Se solicitó recuperación de contraseña para '{user.username}' "
                f"({'correo enviado' if enviado else 'correo no enviado, ver debug_link'}).",
                usuario=user,
            )

            if not enviado:
                # Fallback de desarrollo: se imprime el enlace en la consola del backend.
                print(f"LINK DE RECUPERACIÓN (no se pudo enviar correo): {link_recuperacion}")
                if settings.DEBUG:
                    return Response({
                        'mensaje': 'No se pudo enviar el correo (revisa BREVO_API_KEY). '
                                   'En modo desarrollo, usa el enlace de abajo.',
                        'debug_link': link_recuperacion,
                    })

        return Response({'mensaje': 'Si existe una cuenta con ese correo, '
                                    'recibirás un enlace de recuperación.'})

# 3. Confirmar la nueva contraseña mediante el token
class ConfirmarResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'error': 'Enlace inválido o expirado.'}, status=status.HTTP_400_BAD_REQUEST)

        if default_token_generator.check_token(user, token):
            password_nueva = request.data.get('password_nueva')
            password_confirmacion = request.data.get('password_confirmacion')

            if not password_nueva or password_nueva != password_confirmacion:
                return Response({'error': 'Las contraseñas no coinciden.'}, status=status.HTTP_400_BAD_REQUEST)

            # Los requisitos de complejidad se aplican AQUÍ (al elegir la nueva contraseña)
            try:
                validate_password(password_nueva, user)
            except ValidationError as e:
                return Response({'error': e.messages}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(password_nueva)  # Se almacena hasheada automáticamente
            user.save()
            registrar_bitacora(
                request, 'UPDATE', 'usuario',
                f"El usuario '{user.username}' restableció su contraseña vía enlace de correo.",
                usuario=user,
            )
            return Response({'mensaje': 'Tu contraseña ha sido restablecida exitosamente.'})
        return Response({'error': 'El token no es válido o ha expirado.'}, status=status.HTTP_400_BAD_REQUEST)

# 4. Registro de Usuario
class RegistroView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegistroUsuarioSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.save()
            registrar_bitacora(
                request, 'CREATE', 'usuario',
                f"Nueva cuenta autorregistrada: '{usuario.username}'.",
                usuario=usuario,
            )
            return Response({"mensaje": "Usuario registrado exitosamente"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EsAdministrador(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.es_administrador
        )


class EsRecepcionistaOAdministrador(permissions.BasePermission):
    """Actores de CU04 (Registrar Expediente de Socio): Recepcionista, Administrador."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.es_recepcionista or request.user.es_administrador)
        )


def _roles_texto(usuario):
    roles = []
    if usuario.es_administrador:
        roles.append('Administrador')
    if usuario.es_recepcionista:
        roles.append('Recepcionista')
    if usuario.es_entrenador:
        roles.append('Entrenador')
    if usuario.es_socio:
        roles.append('Socio')
    return ', '.join(roles) if roles else 'Sin rol'


# 5. ViewSets del sistema Porky Gym

# ----------------------------------------------------------------------------
# CU01: REGISTRAR CUENTA DE USUARIO (gestión desde el panel de Administrador)
# Cada alta/edición/baja queda además registrada en la Bitácora (CU03).
# ----------------------------------------------------------------------------
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [EsAdministrador]

    def perform_create(self, serializer):
        usuario = serializer.save()
        registrar_bitacora(
            self.request, 'CREATE', 'usuario',
            f"El administrador '{self.request.user.username}' creó la cuenta "
            f"'{usuario.username}' con rol(es): {_roles_texto(usuario)}.",
            usuario=self.request.user,
        )

    def perform_update(self, serializer):
        anterior = self.get_object()
        estado_previo = anterior.estado_cuenta
        usuario = serializer.save()
        cambios = []
        if estado_previo != usuario.estado_cuenta:
            cambios.append(f"estado: {estado_previo} → {usuario.estado_cuenta}")
        cambios.append(f"roles actuales: {_roles_texto(usuario)}")
        registrar_bitacora(
            self.request, 'UPDATE', 'usuario',
            f"El administrador '{self.request.user.username}' modificó la cuenta "
            f"'{usuario.username}' ({'; '.join(cambios)}).",
            usuario=self.request.user,
        )

    def perform_destroy(self, instance):
        nombre = instance.username
        instance.delete()
        registrar_bitacora(
            self.request, 'DELETE', 'usuario',
            f"El administrador '{self.request.user.username}' eliminó la cuenta '{nombre}'.",
            usuario=self.request.user,
        )


class SocioViewSet(viewsets.ModelViewSet):
    queryset = Socio.objects.all()
    serializer_class = SocioSerializer
    permission_classes = [permissions.IsAuthenticated]


# ----------------------------------------------------------------------------
# CU04: REGISTRAR EXPEDIENTE DE SOCIO
# Alta de un nuevo socio (con su cuenta de acceso) desde el rol Recepcionista,
# con asignación opcional del plan de membresía inicial.
# ----------------------------------------------------------------------------
class RegistrarSocioView(APIView):
    permission_classes = [EsRecepcionistaOAdministrador]

    def post(self, request):
        serializer = RegistrarSocioSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        resultado = serializer.save()
        usuario = resultado['usuario']
        contrato = resultado['contrato']

        descripcion = f"'{request.user.username}' registró al socio '{usuario.username}' (CI: {usuario.ci})."
        if contrato:
            descripcion += f" Plan inicial asignado: '{contrato.id_plan_mem.nombre_plan}'."
        registrar_bitacora(request, 'CREATE', 'socio', descripcion, usuario=request.user)

        return Response({
            'mensaje': 'Socio registrado exitosamente.',
            'id_socio': usuario.id,
            'username': usuario.username,
            'plan_asignado': contrato.id_plan_mem.nombre_plan if contrato else None,
        }, status=status.HTTP_201_CREATED)


class PlanMembresiaViewSet(viewsets.ModelViewSet):
    queryset = PlanMembresia.objects.all()
    serializer_class = PlanMembresiaSerializer
    permission_classes = [permissions.IsAuthenticated]


# ----------------------------------------------------------------------------
# CU03: REGISTRAR BITÁCORA DE AUDITORÍA
# Solo lectura: el Administrador consulta/filtra/exporta el historial.
# ----------------------------------------------------------------------------
class BitacoraViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Bitacora.objects.all().order_by('-fecha_hora')
    serializer_class = BitacoraSerializer
    permission_classes = [EsAdministrador]

    def _filtrar(self, queryset):
        usuario_id = self.request.query_params.get('usuario')
        fecha = self.request.query_params.get('fecha')  # YYYY-MM-DD
        accion = self.request.query_params.get('accion')

        if usuario_id:
            queryset = queryset.filter(id_usuario_id=usuario_id)
        if fecha:
            queryset = queryset.filter(fecha_hora__date=fecha)
        if accion:
            queryset = queryset.filter(accion__iexact=accion)
        return queryset

    def get_queryset(self):
        return self._filtrar(super().get_queryset())

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Flujo secundario de CU03: exportar la bitácora filtrada a un archivo."""
        queryset = self._filtrar(self.get_queryset())

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="bitacora_auditoria.csv"'

        writer = csv.writer(response)
        writer.writerow(['Fecha y hora', 'Usuario', 'Acción', 'Tabla afectada', 'Descripción', 'IP'])
        for registro in queryset:
            writer.writerow([
                registro.fecha_hora.strftime('%Y-%m-%d %H:%M:%S'),
                registro.id_usuario.username if registro.id_usuario_id else (registro.nombre_usuario_db or 'Sistema'),
                registro.accion,
                registro.tabla_afectada,
                registro.descripcion or '',
                registro.direccion_ip or '',
            ])
        return response

class VentaViewSet(viewsets.ModelViewSet):
    queryset = Venta.objects.all()
    serializer_class = VentaSerializer

class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer

class EjercicioViewSet(viewsets.ModelViewSet):
    queryset = Ejercicio.objects.all()
    serializer_class = EjercicioSerializer

class RutinaViewSet(viewsets.ModelViewSet):
    queryset = Rutina.objects.all()
    serializer_class = RutinaSerializer

class LoginView(TokenObtainPairView):
    """CU02: Autenticar Usuario / Iniciar Sesión.

    <<extend>> hacia CU03: cada intento de inicio de sesión (exitoso o
    fallido) queda registrado en la Bitácora de Auditoría.
    """
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        username = (request.data.get('username') or '').strip()

        try:
            response = super().post(request, *args, **kwargs)
        except Exception as exc:

            registrar_bitacora(
            request,
            'LOGIN_FALLIDO',
            'usuario',
            f"Intento de inicio de sesión fallido para '{username}'.",
            usuario=None,
            nombre_usuario_db=username,
            )
            # ------------------------------------------------------
            # Si la cuenta está desactivada, conservar ese mensaje
            # ------------------------------------------------------
            detalle_error = str(getattr(exc, 'detail', ''))

            if 'desactivada' in detalle_error.lower():
              return Response(
              {
                'detail': 'La cuenta está desactivada. Contacte con el administrador.'
              },
              status=status.HTTP_403_FORBIDDEN
            )
            # ------------------------------------------------------
            # Consultar los intentos fallidos registrados por Axes
            # ------------------------------------------------------
            intento = (
                 AccessAttempt.objects
                .filter(username=username)
                .order_by('-attempt_time')
                .first()
            )
            # ------------------------------------------------------
            # Si alcanzó el límite configurado en settings.py
            # ------------------------------------------------------
            if (
                intento
                and intento.failures_since_start >= settings.AXES_FAILURE_LIMIT
            ):
              return Response(
              {
                'detail': (
                    'Cuenta bloqueada por demasiados intentos fallidos. '
                    'Intente nuevamente en 5 minutos.'
                )
              },
               status=status.HTTP_403_FORBIDDEN
               )
            # ------------------------------------------------------
            # Primeros intentos incorrectos
            # ------------------------------------------------------
            return Response(
             {
               'detail': 'Usuario o contraseña incorrectos.'
             },
             status=status.HTTP_401_UNAUTHORIZED
            )
         

        if response.status_code == 200:
            usuario = Usuario.objects.filter(username=username).first()
            registrar_bitacora(
                request, 'LOGIN', 'usuario',
                f"Inicio de sesión exitoso de '{username}'.",
                usuario=usuario,
                nombre_usuario_db=username,
            )
        else:
            registrar_bitacora(
                request, 'LOGIN_FALLIDO', 'usuario',
                f"Intento de inicio de sesión fallido para '{username}'.",
                usuario=None,
                nombre_usuario_db=username,
            )

        return response
