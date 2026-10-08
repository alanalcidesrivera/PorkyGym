# api/urls.py
from django.urls import path, include
from .views import CambiarPasswordView, SolicitarResetPasswordView, ConfirmarResetPasswordView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegistroView, UsuarioViewSet, SocioViewSet,
    PlanMembresiaViewSet, VentaViewSet, ProductoViewSet,
    EjercicioViewSet, RutinaViewSet, LoginView,
    BitacoraViewSet, RegistrarSocioView,
)

# Configuración del Router para los ViewSets
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)
router.register(r'socios', SocioViewSet)
router.register(r'planes', PlanMembresiaViewSet)
router.register(r'ventas', VentaViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'ejercicios', EjercicioViewSet)
router.register(r'rutinas', RutinaViewSet)
router.register(r'bitacora', BitacoraViewSet, basename='bitacora')  # CU03

urlpatterns = [
    # Rutas de Autenticación
    path('auth/registro/', RegistroView.as_view(), name='registro'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/cambiar-password/', CambiarPasswordView.as_view(), name='cambiar_password'),
    path('auth/solicitar-reset/', SolicitarResetPasswordView.as_view(), name='solicitar_reset'),
    path('auth/confirmar-reset/<uidb64>/<token>/', ConfirmarResetPasswordView.as_view(), name='confirmar_reset'),
    # CU04: Registrar Expediente de Socio (alta desde Recepción)
    path('socios/registrar/', RegistrarSocioView.as_view(), name='registrar_socio'),
    # Rutas generadas por el Router
    path('', include(router.urls)),
]