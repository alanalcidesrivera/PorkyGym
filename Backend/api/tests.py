from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Socio

Usuario = get_user_model()


class UsuarioEdicionTests(TestCase):
    """CU01: editar un usuario sin verse obligado a cambiar la contraseña."""

    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username='admin_test', password='Admin123!', es_administrador=True,
            email='admin@test.com', ci='ADM-1',
        )
        self.target = Usuario.objects.create_user(
            username='target_test', password='OldPass123!', es_entrenador=True,
            email='target@test.com', ci='TGT-1',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_editar_correo_sin_password(self):
        resp = self.client.patch(f'/api/usuarios/{self.target.id}/',
                                 {'email': 'nuevo@test.com'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.target.refresh_from_db()
        self.assertEqual(self.target.email, 'nuevo@test.com')
        self.assertTrue(self.target.check_password('OldPass123!'))

    def test_cambiar_rol_sin_password(self):
        resp = self.client.patch(f'/api/usuarios/{self.target.id}/',
                                 {'es_recepcionista': True}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.target.refresh_from_db()
        self.assertTrue(self.target.es_recepcionista)
        self.assertTrue(self.target.check_password('OldPass123!'))

    def test_activar_desactivar_sin_password(self):
        resp = self.client.patch(f'/api/usuarios/{self.target.id}/',
                                 {'estado_cuenta': 'Inactivo'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.target.refresh_from_db()
        self.assertEqual(self.target.estado_cuenta, 'Inactivo')

    def test_password_vacio_no_cambia_la_anterior(self):
        resp = self.client.patch(
            f'/api/usuarios/{self.target.id}/',
            {'email': 'b@test.com', 'password': '', 'password2': ''},
            format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.target.refresh_from_db()
        self.assertTrue(self.target.check_password('OldPass123!'))

    def test_password_nueva_valida_se_aplica(self):
        resp = self.client.patch(
            f'/api/usuarios/{self.target.id}/',
            {'password': 'NewPass123!', 'password2': 'NewPass123!'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.target.refresh_from_db()
        self.assertTrue(self.target.check_password('NewPass123!'))
        self.assertNotEqual(self.target.password, 'NewPass123!')  # nunca texto plano

    def test_password_nueva_invalida_se_rechaza(self):
        resp = self.client.patch(
            f'/api/usuarios/{self.target.id}/',
            {'email': 'no-guardar@test.com', 'password': 'weak',
             'password2': 'weak'},
            format='json',
        )
        self.assertEqual(resp.status_code, 400, resp.data)
        self.target.refresh_from_db()
        self.assertEqual(self.target.email, 'target@test.com')  # no guarda parcial
        self.assertTrue(self.target.check_password('OldPass123!'))

    def test_password_nunca_se_devuelve(self):
        resp = self.client.get(f'/api/usuarios/{self.target.id}/')
        self.assertNotIn('password', resp.data)
        self.assertNotIn('password2', resp.data)


class UsuarioCreacionRolSocioTests(TestCase):
    """CU01/CU04: la creación ordinaria no permite asignar el rol de socio."""

    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username='admin_test', password='Admin123!', es_administrador=True,
            email='admin@test.com', ci='ADM-1',
        )
        self.target = Usuario.objects.create_user(
            username='target_test', password='OldPass123!', es_entrenador=True,
            email='target@test.com', ci='TGT-1',
        )
        self.socio_user = Usuario.objects.create_user(
            username='socio_test', password='Socio123!', es_socio=True,
            email='socio@test.com', ci='SOC-1',
        )
        Socio.objects.create(id_socio=self.socio_user, fecha_nacimiento='1990-01-01')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_crear_roles_ordinarios(self):
        for flag, username in [
            ('es_administrador', 'nuevo_admin'),
            ('es_entrenador', 'nuevo_entrenador'),
            ('es_recepcionista', 'nuevo_recepcionista'),
        ]:
            resp = self.client.post('/api/usuarios/', {
                'username': username, 'email': f'{username}@test.com',
                'password': 'NewPass123!', 'password2': 'NewPass123!',
                flag: True,
            }, format='json')
            self.assertEqual(resp.status_code, 201, resp.data)

    def test_crear_con_rol_socio_se_rechaza(self):
        resp = self.client.post('/api/usuarios/', {
            'username': 'no_debe_existir', 'email': 'x@test.com',
            'password': 'NewPass123!', 'password2': 'NewPass123!',
            'es_socio': True,
        }, format='json')
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertIn('es_socio', resp.data)
        self.assertFalse(Usuario.objects.filter(username='no_debe_existir').exists())

    def test_creacion_sigue_exigiendo_password(self):
        resp = self.client.post('/api/usuarios/', {
            'username': 'sin_password', 'email': 'n@test.com',
            'es_entrenador': True,
        }, format='json')
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertIn('password', resp.data)

    def test_no_promover_a_socio_por_edicion(self):
        resp = self.client.patch(f'/api/usuarios/{self.target.id}/',
                                 {'es_socio': True}, format='json')
        self.assertEqual(resp.status_code, 400, resp.data)
        self.target.refresh_from_db()
        self.assertFalse(self.target.es_socio)

    def test_edicion_conserva_rol_socio_existente(self):
        resp = self.client.patch(
            f'/api/usuarios/{self.socio_user.id}/',
            {'es_socio': True, 'email': 'socio2@test.com'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.socio_user.refresh_from_db()
        self.assertTrue(self.socio_user.es_socio)
        self.assertEqual(self.socio_user.email, 'socio2@test.com')

    def test_registrar_nuevo_socio_crea_expediente_y_aparece_en_selector(self):
        from .models import MetodoPago
        MetodoPago.objects.get_or_create(descripcion='Efectivo')
        resp = self.client.post('/api/socios/registrar/', {
            'username': 'socio_nuevo', 'email': 'sn@test.com', 'ci': 'NS-1',
            'password': 'Socio123!', 'password2': 'Socio123!',
            'fecha_nacimiento': '1995-05-05',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        nuevo = Usuario.objects.get(username='socio_nuevo')
        self.assertTrue(nuevo.es_socio)
        self.assertTrue(Socio.objects.filter(id_socio=nuevo).exists())

        selector = self.client.get('/api/socios/')
        self.assertEqual(selector.status_code, 200)
        usernames = [s['username'] for s in selector.data]
        self.assertIn('socio_nuevo', usernames)
