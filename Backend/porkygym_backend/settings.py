from pathlib import Path
from decouple import config
from datetime import timedelta
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = []

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Librerías de terceros
    'corsheaders',  # <--- Asegúrate de que esté SOLO UNA VEZ
    'rest_framework',
    'axes',
    
    # Tus aplicaciones
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Debe ir lo más arriba posible
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'axes.middleware.AxesMiddleware',
]
CORS_ALLOW_ALL_ORIGINS = True

# Permitir solicitudes desde el frontend de Vite (puerto 3000) y puerto por defecto 5173
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

ROOT_URLCONF = 'porkygym_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'porkygym_backend.wsgi.application'

# Database Configuration (PostgreSQL)
# Configura estos campos según las credenciales de tu PostgreSQL en tu máquina
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Password hashing: Django almacena contraseñas como hash PBKDF2-SHA256 con salt
# (aplicado automáticamente por set_password() / create_user(), nunca en texto plano).
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]

# Internationalization
LANGUAGE_CODE = 'es-es'

TIME_ZONE = 'America/La_Paz'

USE_I18N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# cambioooooooooooooooooooooooooooooooooooooooooooooooooooooooooo
AUTH_USER_MODEL = 'api.Usuario'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}

AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesStandaloneBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# Configuración de bloqueo por tiempo (Axes)
AXES_FAILURE_LIMIT = 3            # Bloquea al 3er intento fallido
AXES_COOLOFF_TIME = timedelta(minutes=5)      # Bloqueo por 5 minutos (0.25 horas)
# Bloquear por nombre de usuario, no por IP completa
AXES_LOCKOUT_PARAMETERS = ["username"]

# Validadores estrictos de contraseña
# (8 caracteres, Mayúscula, Minúscula, Número, Símbolo).
# Se aplican SOLO al elegir la contraseña (registro, reset y cambio de contraseña).
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'api.password_validators.ComplexityPasswordValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Envío de correos para "Olvidé mi contraseña" (Configuración para desarrollo)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# --- Brevo (correos transaccionales de recuperación de contraseña) ---
# La API Key se define en Backend/.env como BREVO_API_KEY
BREVO_API_KEY = config('BREVO_API_KEY', default='')
BREVO_SENDER_EMAIL = config('BREVO_SENDER_EMAIL', default='soporte@porkygym.com')

# URL pública del frontend para construir el enlace de recuperación
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')