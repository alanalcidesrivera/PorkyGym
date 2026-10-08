import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// URL base del backend Django
const API_URL = 'http://127.0.0.1:8000/api';

interface UsuarioActual {
  id: number;
  username: string;
  email?: string;
  estado_cuenta: string;

  es_socio: boolean;
  es_entrenador: boolean;
  es_recepcionista: boolean;
  es_administrador: boolean;

  is_superuser: boolean;
}

// ============================================================
// 1. Función para validar la seguridad de la contraseña
//    (se aplica SOLO al registrarse o al elegir una NUEVA contraseña)
// ============================================================
export const validarPassword = (password: string): boolean => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;
  return regex.test(password);
};

// ============================================================
// Estilos compartidos
// ============================================================
const inputCls =
  'w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-yellow-500 outline-none';
const btnCls =
  'w-full bg-yellow-500 text-black font-bold p-3 rounded hover:bg-yellow-400 mt-2 uppercase tracking-wide transition-colors';
const linkCls =
  'text-yellow-400 hover:text-white transition-colors underline';

const Tarjeta = ({ children, titulo }: { children: React.ReactNode; titulo: string }) => (
  <div className="max-w-md mx-auto mt-10 p-6 bg-gray-900 text-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
    <h2 className="text-2xl font-bold mb-4 text-center">{titulo}</h2>
    {children}
  </div>
);

const Alerta = ({ tipo, children }: { tipo: 'error' | 'ok'; children: React.ReactNode }) => (
  <div
    className={
      tipo === 'ok'
        ? 'text-green-400 text-sm mb-2'
        : 'text-red-400 text-sm mb-2'
    }
  >
    {children}
  </div>
);

const mensajeDeError = (data: any): string => {
  if (!data) return 'Error del servidor.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return Array.isArray(data.error) ? data.error.join('. ') : String(data.error);
  for (const key of Object.keys(data)) {
    const v = data[key];
    if (Array.isArray(v) && v.length > 0) return `${key}: ${v.join(', ')}`;
    if (typeof v === 'string' && v) return `${key}: ${v}`;
  }
  return 'Error del servidor.';
};

// ============================================================
// 2. Campo de contraseña con OJO para mostrar/ocultar
// ============================================================
interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${inputCls} pr-10`}
          required
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 cursor-pointer"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// 3. Barra de Navegación (solo visible si hay sesión)
// ============================================================
interface NavbarProps {
  pantallaActual: string;
  onGestionUsuarios: () => void;
  onBitacora: () => void;
  onRegistrarSocio: () => void;
  onInicio: () => void;
}

export const Navbar = ({
  pantallaActual,
  onGestionUsuarios,
  onBitacora,
  onRegistrarSocio,
  onInicio,
}: NavbarProps) => {
  const token = localStorage.getItem('access_token');
  const usuarioGuardado = localStorage.getItem('usuario');

  if (!token || !usuarioGuardado) return null;

  const usuario: UsuarioActual = JSON.parse(usuarioGuardado);

  const btnActivo = 'px-3 py-1 bg-yellow-500 text-black rounded font-bold';
  const btnInactivo = 'px-3 py-1 bg-gray-800 rounded text-white hover:bg-gray-700';

  return (
    <nav className="flex flex-wrap bg-black text-white p-2 gap-2">
      <button
        onClick={onInicio}
        className={pantallaActual === 'inicio' ? btnActivo : btnInactivo}
      >
        INICIO
      </button>

      {/* PAQUETE 1: SEGURIDAD, AUTENTICACIÓN Y AUDITORÍA */}

      {/* CU01: Registrar Cuenta de Usuario — solo Administrador */}
      {usuario.es_administrador && (
        <button
          onClick={onGestionUsuarios}
          className={pantallaActual === 'usuarios' ? btnActivo : btnInactivo}
        >
          GESTIONAR USUARIOS
        </button>
      )}

      {/* CU03: Registrar Bitácora de Auditoría — solo Administrador */}
      {usuario.es_administrador && (
        <button
          onClick={onBitacora}
          className={pantallaActual === 'bitacora' ? btnActivo : btnInactivo}
        >
          BITÁCORA
        </button>
      )}

      {/* PAQUETE 2: GESTIÓN DE SOCIOS, MEMBRESÍAS Y CONTROL DE ACCESO */}

      {/* CU04: Registrar Expediente de Socio — Recepcionista, Administrador */}
      {(usuario.es_recepcionista || usuario.es_administrador) && (
        <button
          onClick={onRegistrarSocio}
          className={pantallaActual === 'registrar-socio' ? btnActivo : btnInactivo}
        >
          REGISTRAR SOCIO
        </button>
      )}

      <button
        onClick={() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('usuario');

          window.location.reload();
        }}
        className="bg-red-600 px-3 py-1 ml-auto rounded font-bold"
      >
        CERRAR SESIÓN
      </button>
    </nav>
  );
};

// ============================================================
// 4. Formulario de Login
//    (AQUÍ NO se exigen requisitos de contraseña: solo se verifica)
// ============================================================
interface LoginFormProps {
  mensajeInicio?: string;
  onIrARecuperar: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ mensajeInicio, onIrARecuperar }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const response = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);

        localStorage.setItem(
          'usuario',
          JSON.stringify(data.usuario)
        );

        window.location.reload();
      } else {
        setError(mensajeDeError(data));
      }
    } catch {
      setError('Error al conectar con el servidor de Django. Asegúrate de que está corriendo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Tarjeta titulo="INICIAR SESIÓN">
      {mensajeInicio && <Alerta tipo="ok">{mensajeInicio}</Alerta>}
      {error && <Alerta tipo="error">{error}</Alerta>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1">Usuario:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputCls}
            autoComplete="username"
            required
          />
        </div>

        <PasswordInput
          id="login-password"
          label="Contraseña:"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <div className="flex justify-between items-center mt-1">
          <button
            type="button"
            onClick={onIrARecuperar}
            className={linkCls}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button type="submit" className={btnCls} disabled={cargando}>
          {cargando ? 'INGRESANDO...' : 'INGRESAR'}
        </button>
      </form>
    </Tarjeta>
  );
};

// ============================================================
// 5. Formulario de Registro
// ============================================================
interface RegistroFormProps {
  onRegistrado: (mensaje: string) => void;
  onVolver: () => void;
}

const RegistroForm: React.FC<RegistroFormProps> = ({ onRegistrado, onVolver }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Requisitos de contraseña aplicados AL REGISTRARSE
    if (!validarPassword(password)) {
      setError(
        'La contraseña debe tener mínimo 8 caracteres, una mayúscula (A), una minúscula (a), un número (1) y un símbolo (@,*.#_-$).'
      );
      return;
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      const response = await fetch(`${API_URL}/auth/registro/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password, password2 }),
      });
      const data = await response.json();

      if (response.ok) {
        onRegistrado('¡Registro exitoso! Ya puedes iniciar sesión.');
      } else {
        setError(mensajeDeError(data));
      }
    } catch {
      setError('Error al conectar con el servidor de Django. Asegúrate de que está corriendo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Tarjeta titulo="CREAR CUENTA">
      {error && <Alerta tipo="error">{error}</Alerta>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1">Usuario:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputCls}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Correo electrónico:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
            required
          />
        </div>

        <PasswordInput
          id="reg-password"
          label="Contraseña:"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <PasswordInput
          id="reg-password2"
          label="Confirmar contraseña:"
          value={password2}
          onChange={setPassword2}
          autoComplete="new-password"
        />

        <button type="submit" className={btnCls} disabled={cargando}>
          {cargando ? 'REGISTRANDO...' : 'REGISTRARSE'}
        </button>
        <button type="button" onClick={onVolver} className="text-gray-400 text-sm hover:text-white">
          ← Volver al inicio de sesión
        </button>
      </form>
    </Tarjeta>
  );
};

// ============================================================
// 6. Formulario "Olvidé mi contraseña" (envía el correo vía Brevo)
// ============================================================
interface RecuperarFormProps {
  onEnviado: (mensaje: string) => void;
  onVolver: () => void;
}

const RecuperarForm: React.FC<RecuperarFormProps> = ({ onEnviado, onVolver }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDebugLink(null);
    setCargando(true);

    try {
      const response = await fetch(`${API_URL}/auth/solicitar-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();

      if (response.ok) {
        if (data.debug_link) {
          setDebugLink(data.debug_link);
        } else {
          onEnviado(data.mensaje || 'Revisa tu correo para continuar.');
        }
      } else {
        setError(mensajeDeError(data));
      }
    } catch {
      setError('Error al conectar con el servidor de Django. Asegúrate de que está corriendo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Tarjeta titulo="RECUPERAR CONTRASEÑA">
      {error && <Alerta tipo="error">{error}</Alerta>}
      {debugLink && (
        <Alerta tipo="ok">
          En modo desarrollo (sin BREVO_API_KEY) usa este enlace directo:
          <a href={debugLink} className="underline break-all">{debugLink}</a>
        </Alerta>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-gray-400">
          Escribe tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>
        <div>
          <label className="block text-sm mb-1">Correo electrónico:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
            required
          />
        </div>

        <button type="submit" className={btnCls} disabled={cargando}>
          {cargando ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
        </button>
        <button type="button" onClick={onVolver} className="text-gray-400 text-sm hover:text-white">
          ← Volver al inicio de sesión
        </button>
      </form>
    </Tarjeta>
  );
};

// ============================================================
// 7. Formulario para elegir la NUEVA contraseña
//    (llega aquí desde el correo: /reset-password/uid/token/)
//    (AQUÍ se aplican los requisitos de seguridad)
// ============================================================
interface ResetPasswordFormProps {
  uid: string;
  token: string;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ uid, token }) => {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validarPassword(password)) {
      setError(
        'La contraseña debe tener mínimo 8 caracteres, una mayúscula (A), una minúscula (a), un número (1) y un símbolo (@,*.#_-$).'
      );
      return;
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      const response = await fetch(`${API_URL}/auth/confirmar-reset/${uid}/${token}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password_nueva: password, password_confirmacion: password2 }),
      });
      const data = await response.json();

      if (response.ok) {
        setOk(true);
      } else {
        setError(mensajeDeError(data));
      }
    } catch {
      setError('Error al conectar con el servidor de Django.');
    } finally {
      setCargando(false);
    }
  };

  if (ok) {
    return (
      <Tarjeta titulo="CONTRASEÑA RESTABLECIDA">
        <p className="text-green-400 text-sm mb-4">
          Tu contraseña fue actualizada con éxito. Ya puedes iniciar sesión.
        </p>
        <button onClick={() => (window.location.href = '/')} className={btnCls}>
          IR AL INICIO
        </button>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta titulo="NUEVA CONTRASEÑA">
      {error && <Alerta tipo="error">{error}</Alerta>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-gray-400">
          Elige una nueva contraseña con: mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.
        </p>

        <PasswordInput
          id="reset-password"
          label="Nueva contraseña:"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <PasswordInput
          id="reset-password2"
          label="Confirmar contraseña:"
          value={password2}
          onChange={setPassword2}
          autoComplete="new-password"
        />

        <button type="submit" className={btnCls} disabled={cargando}>
          {cargando ? 'GUARDANDO...' : 'GUARDAR NUEVA CONTRASEÑA'}
        </button>
      </form>
    </Tarjeta>
  );
};

// ============================================================
// 8. Puerta de autenticación: login / registro / recuperar
// ============================================================
const AuthGate = () => {
  const [modo, setModo] = useState<'login' | 'recuperar'>('login');
  const [mensajeLogin, setMensajeLogin] = useState('');

  return (
    <>
      {modo === 'login' && (
        <LoginForm
          mensajeInicio={mensajeLogin}
          onIrARecuperar={() => setModo('recuperar')}
        />
      )}
      {modo === 'recuperar' && (
        <RecuperarForm
          onEnviado={(m) => {
            setMensajeLogin(m);
            setModo('login');
          }}
          onVolver={() => setModo('login')}
        />
      )}
    </>
  );
};

// ============================================================
// 9. Componente Principal
// ============================================================

interface UsuarioListado {
  id: number;
  username: string;
  email: string;
  estado_cuenta: string;
  es_socio: boolean;
  es_entrenador: boolean;
  es_recepcionista: boolean;
  es_administrador: boolean;
}

const GestionUsuarios = ({ onVolver }: { onVolver: () => void }) => {
  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',

    es_administrador: false,
    es_recepcionista: false,
    es_entrenador: false,
    es_socio: false,
  });
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    'administradores' |
    'recepcionistas' |
    'entrenadores' |
    'socios' |
    'sin_rol' |
    null
  >(null);

  const [creando, setCreando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState('');
  const [mensajeFormulario, setMensajeFormulario] = useState('');
  const [usuarioEditando, setUsuarioEditando] =
    useState<UsuarioListado | null>(null);

  const [formEdicion, setFormEdicion] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',

    es_administrador: false,
    es_recepcionista: false,
    es_entrenador: false,
    es_socio: false,
  });

  const [errorEdicion, setErrorEdicion] = useState('');
  const [mensajeAccion, setMensajeAccion] = useState('');

  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const token = localStorage.getItem('access_token');

        const response = await fetch(`${API_URL}/usuarios/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('No se pudieron cargar los usuarios');
        }

        const data = await response.json();
        setUsuarios(data);
      } catch (error) {
        setError('Error al cargar los usuarios');
      } finally {
        setCargando(false);
      }
    };

    cargarUsuarios();
  }, []);

  const obtenerRoles = (usuario: UsuarioListado) => {
    const roles: string[] = [];

    if (usuario.es_administrador) roles.push('Administrador');
    if (usuario.es_recepcionista) roles.push('Recepcionista');
    if (usuario.es_entrenador) roles.push('Entrenador');
    if (usuario.es_socio) roles.push('Socio');

    return roles.length > 0 ? roles.join(', ') : 'Sin rol';
  };
  const usuariosFiltrados = () => {
    switch (categoriaSeleccionada) {

      case 'administradores':
        return usuarios.filter(
          (usuario) => usuario.es_administrador
        );

      case 'recepcionistas':
        return usuarios.filter(
          (usuario) => usuario.es_recepcionista
        );

      case 'entrenadores':
        return usuarios.filter(
          (usuario) => usuario.es_entrenador
        );

      case 'socios':
        return usuarios.filter(
          (usuario) => usuario.es_socio
        );

      case 'sin_rol':
        return usuarios.filter(
          (usuario) =>
            !usuario.es_administrador &&
            !usuario.es_recepcionista &&
            !usuario.es_entrenador &&
            !usuario.es_socio
        );

      default:
        return [];
    }
  };
  const tituloCategoria = () => {
    switch (categoriaSeleccionada) {
      case 'administradores':
        return 'ADMINISTRADORES';

      case 'recepcionistas':
        return 'RECEPCIONISTAS';

      case 'entrenadores':
        return 'ENTRENADORES';

      case 'socios':
        return 'SOCIOS';

      case 'sin_rol':
        return 'USUARIOS SIN ROL';

      default:
        return '';
    }
  };
  const abrirEdicion = (usuario: UsuarioListado) => {
    setUsuarioEditando(usuario);

    setFormEdicion({
      username: usuario.username,
      email: usuario.email || '',
      password: '',
      password2: '',

      es_administrador: usuario.es_administrador,
      es_recepcionista: usuario.es_recepcionista,
      es_entrenador: usuario.es_entrenador,
      es_socio: usuario.es_socio,
    });

    setErrorEdicion('');
    setMensajeAccion('');
  };
  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuarioEditando) return;

    setErrorEdicion('');
    setMensajeAccion('');

    const tieneRol =
      formEdicion.es_administrador ||
      formEdicion.es_recepcionista ||
      formEdicion.es_entrenador ||
      formEdicion.es_socio;

    if (!tieneRol) {
      setErrorEdicion('El usuario debe tener al menos un rol.');
      return;
    }

    if (formEdicion.password) {

      if (!validarPassword(formEdicion.password)) {
        setErrorEdicion(
          'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.'
        );
        return;
      }

      if (formEdicion.password !== formEdicion.password2) {
        setErrorEdicion('Las contraseñas no coinciden.');
        return;
      }
    }

    try {
      const token = localStorage.getItem('access_token');

      const datos: any = {
        username: formEdicion.username,
        email: formEdicion.email,

        es_administrador: formEdicion.es_administrador,
        es_recepcionista: formEdicion.es_recepcionista,
        es_entrenador: formEdicion.es_entrenador,
        es_socio: formEdicion.es_socio,
      };

      // Solo enviamos contraseña si realmente la cambió
      if (formEdicion.password) {
        datos.password = formEdicion.password;
        datos.password2 = formEdicion.password2;
      }

      const response = await fetch(
        `${API_URL}/usuarios/${usuarioEditando.id}/`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(datos),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorEdicion(mensajeDeError(data));
        return;
      }

      setUsuarios((anteriores) =>
        anteriores.map((u) =>
          u.id === usuarioEditando.id
            ? data
            : u
        )
      );

      setUsuarioEditando(null);
      setMensajeAccion('Usuario actualizado correctamente.');

    } catch {
      setErrorEdicion('No se pudo conectar con el servidor.');
    }
  };
  const desactivarUsuario = async (usuario: UsuarioListado) => {

    const confirmar = window.confirm(
      `¿Desea desactivar al usuario "${usuario.username}"?`
    );

    if (!confirmar) return;

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(
        `${API_URL}/usuarios/${usuario.id}/`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            estado_cuenta: 'Inactivo',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMensajeAccion('No se pudo desactivar el usuario.');
        return;
      }

      setUsuarios((anteriores) =>
        anteriores.map((u) =>
          u.id === usuario.id
            ? data
            : u
        )
      );

      setMensajeAccion(
        `Usuario ${usuario.username} desactivado correctamente.`
      );

    } catch {
      setMensajeAccion(
        'No se pudo conectar con el servidor.'
      );
    }
  };
  const activarUsuario = async (usuario: UsuarioListado) => {

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(
        `${API_URL}/usuarios/${usuario.id}/`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            estado_cuenta: 'Activo',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMensajeAccion('No se pudo activar el usuario.');
        return;
      }

      setUsuarios((anteriores) =>
        anteriores.map((u) =>
          u.id === usuario.id
            ? data
            : u
        )
      );

      setMensajeAccion(
        `Usuario ${usuario.username} activado correctamente.`
      );

    } catch {
      setMensajeAccion(
        'No se pudo conectar con el servidor.'
      );
    }
  };
  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorFormulario('');
    setMensajeFormulario('');

    if (!validarPassword(nuevoUsuario.password)) {
      setErrorFormulario(
        'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.'
      );
      return;
    }

    if (nuevoUsuario.password !== nuevoUsuario.password2) {
      setErrorFormulario('Las contraseñas no coinciden.');
      return;
    }

    const tieneRol =
      nuevoUsuario.es_administrador ||
      nuevoUsuario.es_recepcionista ||
      nuevoUsuario.es_entrenador ||
      nuevoUsuario.es_socio;

    if (!tieneRol) {
      setErrorFormulario(
        'Debe seleccionar al menos un rol para el usuario.'
      );
      return;
    }

    setCreando(true);

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${API_URL}/usuarios/`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          ...nuevoUsuario,
          estado_cuenta: 'Activo',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorFormulario(mensajeDeError(data));
        return;
      }

      setMensajeFormulario(
        'Usuario creado correctamente.'
      );

      setUsuarios((anteriores) => [
        ...anteriores,
        data,
      ]);

      setNuevoUsuario({
        username: '',
        email: '',
        password: '',
        password2: '',

        es_administrador: false,
        es_recepcionista: false,
        es_entrenador: false,
        es_socio: false,
      });

    } catch {
      setErrorFormulario(
        'No se pudo conectar con el servidor.'
      );
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="p-6 text-white">
      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          GESTIÓN DE USUARIOS
        </h1>

        <div className="flex gap-3">
          <button
            onClick={() => setMostrarFormulario(true)}
            className="bg-yellow-500 text-black px-4 py-2 rounded font-bold"
          >
            + NUEVO USUARIO
          </button>

          <button
            onClick={onVolver}
            className="bg-gray-700 px-4 py-2 rounded"
          >
            VOLVER
          </button>
        </div>

      </div>
      {mensajeAccion && (
        <p className="mb-4 text-green-400">
          {mensajeAccion}
        </p>
      )}

      {cargando && (
        <p>Cargando usuarios...</p>
      )}

      {error && (
        <p className="text-red-400">
          {error}
        </p>
      )}
      {mostrarFormulario && (
        <div className="mb-6 bg-gray-900 p-6 rounded">

          <h2 className="text-2xl font-bold mb-5">
            NUEVO USUARIO
          </h2>

          {errorFormulario && (
            <p className="mb-4 text-red-400">
              {errorFormulario}
            </p>
          )}

          {mensajeFormulario && (
            <p className="mb-4 text-green-400">
              {mensajeFormulario}
            </p>
          )}

          <form
            onSubmit={crearUsuario}
            className="flex flex-col gap-4"
          >

            <div>
              <label className="block mb-1">
                Usuario:
              </label>

              <input
                type="text"
                value={nuevoUsuario.username}
                onChange={(e) =>
                  setNuevoUsuario({
                    ...nuevoUsuario,
                    username: e.target.value,
                  })
                }
                className={inputCls}
                required
              />
            </div>


            <div>
              <label className="block mb-1">
                Correo:
              </label>

              <input
                type="email"
                value={nuevoUsuario.email}
                onChange={(e) =>
                  setNuevoUsuario({
                    ...nuevoUsuario,
                    email: e.target.value,
                  })
                }
                className={inputCls}
                required
              />
            </div>


            <PasswordInput
              id="admin-password"
              label="Contraseña:"
              value={nuevoUsuario.password}
              onChange={(valor) =>
                setNuevoUsuario({
                  ...nuevoUsuario,
                  password: valor,
                })
              }
              autoComplete="new-password"
            />


            <PasswordInput
              id="admin-password2"
              label="Confirmar contraseña:"
              value={nuevoUsuario.password2}
              onChange={(valor) =>
                setNuevoUsuario({
                  ...nuevoUsuario,
                  password2: valor,
                })
              }
              autoComplete="new-password"
            />


            <div className="mt-2">

              <p className="font-bold mb-3">
                Roles:
              </p>

              <div className="flex flex-wrap gap-5">

                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={nuevoUsuario.es_administrador}
                    onChange={(e) =>
                      setNuevoUsuario({
                        ...nuevoUsuario,
                        es_administrador: e.target.checked,
                      })
                    }
                  />
                  Administrador
                </label>


                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={nuevoUsuario.es_recepcionista}
                    onChange={(e) =>
                      setNuevoUsuario({
                        ...nuevoUsuario,
                        es_recepcionista: e.target.checked,
                      })
                    }
                  />
                  Recepcionista
                </label>


                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={nuevoUsuario.es_entrenador}
                    onChange={(e) =>
                      setNuevoUsuario({
                        ...nuevoUsuario,
                        es_entrenador: e.target.checked,
                      })
                    }
                  />
                  Entrenador
                </label>


                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={nuevoUsuario.es_socio}
                    onChange={(e) =>
                      setNuevoUsuario({
                        ...nuevoUsuario,
                        es_socio: e.target.checked,
                      })
                    }
                  />
                  Socio
                </label>

              </div>

            </div>


            <div className="flex gap-3 mt-3">

              <button
                type="submit"
                disabled={creando}
                className="bg-yellow-500 text-black px-5 py-2 rounded font-bold"
              >
                {creando
                  ? 'CREANDO...'
                  : 'GUARDAR USUARIO'}
              </button>


              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(false);
                  setErrorFormulario('');
                  setMensajeFormulario('');
                }}
                className="bg-red-600 px-5 py-2 rounded"
              >
                CANCELAR
              </button>

            </div>

          </form>

        </div>
      )}
      {usuarioEditando && (
        <div className="mb-6 bg-gray-900 p-6 rounded">

          <h2 className="text-2xl font-bold mb-5">
            EDITAR USUARIO
          </h2>

          <p className="mb-4 text-gray-400">
            Editando: {usuarioEditando.username}
          </p>

          {errorEdicion && (
            <p className="text-red-400 mb-4">
              {errorEdicion}
            </p>
          )}

          <form
            onSubmit={guardarEdicion}
            className="flex flex-col gap-4"
          >

            <div>
              <label className="block mb-1">
                Usuario:
              </label>

              <input
                type="text"
                value={formEdicion.username}
                onChange={(e) =>
                  setFormEdicion({
                    ...formEdicion,
                    username: e.target.value,
                  })
                }
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="block mb-1">
                Correo:
              </label>

              <input
                type="email"
                value={formEdicion.email}
                onChange={(e) =>
                  setFormEdicion({
                    ...formEdicion,
                    email: e.target.value,
                  })
                }
                className={inputCls}
                required
              />
            </div>

            <PasswordInput
              id="editar-password"
              label="Nueva contraseña (opcional):"
              value={formEdicion.password}
              onChange={(valor) =>
                setFormEdicion({
                  ...formEdicion,
                  password: valor,
                })
              }
              autoComplete="new-password"
            />

            <PasswordInput
              id="editar-password2"
              label="Confirmar nueva contraseña:"
              value={formEdicion.password2}
              onChange={(valor) =>
                setFormEdicion({
                  ...formEdicion,
                  password2: valor,
                })
              }
              autoComplete="new-password"
            />

            <div>
              <p className="font-bold mb-3">
                Roles:
              </p>

              <div className="flex flex-wrap gap-5">

                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={formEdicion.es_administrador}
                    onChange={(e) =>
                      setFormEdicion({
                        ...formEdicion,
                        es_administrador: e.target.checked,
                      })
                    }
                  />
                  Administrador
                </label>

                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={formEdicion.es_recepcionista}
                    onChange={(e) =>
                      setFormEdicion({
                        ...formEdicion,
                        es_recepcionista: e.target.checked,
                      })
                    }
                  />
                  Recepcionista
                </label>

                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={formEdicion.es_entrenador}
                    onChange={(e) =>
                      setFormEdicion({
                        ...formEdicion,
                        es_entrenador: e.target.checked,
                      })
                    }
                  />
                  Entrenador
                </label>

                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={formEdicion.es_socio}
                    onChange={(e) =>
                      setFormEdicion({
                        ...formEdicion,
                        es_socio: e.target.checked,
                      })
                    }
                  />
                  Socio
                </label>

              </div>
            </div>

            <div className="flex gap-3 mt-3">

              <button
                type="submit"
                className="bg-yellow-500 text-black px-5 py-2 rounded font-bold"
              >
                GUARDAR CAMBIOS
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsuarioEditando(null);
                  setErrorEdicion('');
                }}
                className="bg-gray-700 px-5 py-2 rounded"
              >
                CANCELAR
              </button>

            </div>

          </form>

        </div>
      )}

      {!cargando && !error && categoriaSeleccionada === null && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          <button
            onClick={() => setCategoriaSeleccionada('administradores')}
            className="bg-gray-900 border border-gray-700 p-6 rounded text-left hover:bg-gray-800"
          >
            <h2 className="text-xl font-bold text-yellow-400">
              ADMINISTRADORES
            </h2>

            <p className="mt-2 text-gray-300">
              {
                usuarios.filter(
                  (usuario) => usuario.es_administrador
                ).length
              } usuario(s)
            </p>
          </button>


          <button
            onClick={() => setCategoriaSeleccionada('recepcionistas')}
            className="bg-gray-900 border border-gray-700 p-6 rounded text-left hover:bg-gray-800"
          >
            <h2 className="text-xl font-bold">
              RECEPCIONISTAS
            </h2>

            <p className="mt-2 text-gray-300">
              {
                usuarios.filter(
                  (usuario) => usuario.es_recepcionista
                ).length
              } usuario(s)
            </p>
          </button>


          <button
            onClick={() => setCategoriaSeleccionada('entrenadores')}
            className="bg-gray-900 border border-gray-700 p-6 rounded text-left hover:bg-gray-800"
          >
            <h2 className="text-xl font-bold">
              ENTRENADORES
            </h2>

            <p className="mt-2 text-gray-300">
              {
                usuarios.filter(
                  (usuario) => usuario.es_entrenador
                ).length
              } usuario(s)
            </p>
          </button>


          <button
            onClick={() => setCategoriaSeleccionada('socios')}
            className="bg-gray-900 border border-gray-700 p-6 rounded text-left hover:bg-gray-800"
          >
            <h2 className="text-xl font-bold">
              SOCIOS
            </h2>

            <p className="mt-2 text-gray-300">
              {
                usuarios.filter(
                  (usuario) => usuario.es_socio
                ).length
              } usuario(s)
            </p>
          </button>


          <button
            onClick={() => setCategoriaSeleccionada('sin_rol')}
            className="bg-gray-900 border border-red-800 p-6 rounded text-left hover:bg-gray-800"
          >
            <h2 className="text-xl font-bold text-red-400">
              SIN ROL
            </h2>

            <p className="mt-2 text-gray-300">
              {
                usuarios.filter(
                  (usuario) =>
                    !usuario.es_administrador &&
                    !usuario.es_recepcionista &&
                    !usuario.es_entrenador &&
                    !usuario.es_socio
                ).length
              } usuario(s)
            </p>
          </button>

        </div>
      )}
      {!cargando && !error && categoriaSeleccionada !== null && (
        <div>

          <div className="flex justify-between items-center mb-4">

            <h2 className="text-2xl font-bold">
              {tituloCategoria()}
            </h2>

            <button
              onClick={() => setCategoriaSeleccionada(null)}
              className="bg-gray-700 px-4 py-2 rounded"
            >
              VOLVER A CATEGORÍAS
            </button>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full border-collapse">

              <thead>
                <tr className="bg-gray-800">

                  <th className="p-3 text-left">
                    IDENTIFICACIÓN
                  </th>

                  <th className="p-3 text-left">
                    Usuario
                  </th>

                  <th className="p-3 text-left">
                    Correo
                  </th>

                  <th className="p-3 text-left">
                    Roles
                  </th>

                  <th className="p-3 text-left">
                    Estado
                  </th>
                  <th className="p-3 text-left">
                    Acciones
                  </th>

                </tr>
              </thead>


              <tbody>

                {usuariosFiltrados().map((usuario) => (

                  <tr
                    key={usuario.id}
                    className="border-b border-gray-700"
                  >

                    <td className="p-3">
                      {usuario.id}
                    </td>

                    <td className="p-3">
                      {usuario.username}
                    </td>

                    <td className="p-3">
                      {usuario.email || '-'}
                    </td>

                    <td className="p-3">
                      {obtenerRoles(usuario)}
                    </td>

                    <td className="p-3">
                      {usuario.estado_cuenta}
                    </td>
                    <td className="p-3">

                      <div className="flex gap-2">

                        <button
                          onClick={() => abrirEdicion(usuario)}
                          className="bg-blue-600 px-3 py-1 rounded"
                        >
                          EDITAR
                        </button>

                        {usuario.estado_cuenta === 'Activo' ? (

                          <button
                            onClick={() => desactivarUsuario(usuario)}
                            className="bg-red-600 px-3 py-1 rounded"
                          >
                            DESACTIVAR
                          </button>

                        ) : (

                          <button
                            onClick={() => activarUsuario(usuario)}
                            className="bg-green-600 px-3 py-1 rounded"
                          >
                            ACTIVAR
                          </button>

                        )}

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>


          {usuariosFiltrados().length === 0 && (
            <p className="mt-4 text-gray-400">
              No existen usuarios registrados en esta categoría.
            </p>
          )}

        </div>
      )}

    </div>
  );
};

// ============================================================
// 10. CU03: Registrar Bitácora de Auditoría (consulta, filtra y exporta)
// ============================================================
interface RegistroBitacora {
  id_bitacora: number;
  id_usuario: number | null;
  usuario_username: string;
  nombre_usuario_db: string | null;
  accion: string;
  tabla_afectada: string;
  descripcion: string | null;
  direccion_ip: string | null;
  fecha_hora: string;
}

const PantallaBitacora = ({ onVolver }: { onVolver: () => void }) => {
  const [registros, setRegistros] = useState<RegistroBitacora[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    // Se carga una sola vez para poder filtrar "por usuario"
    fetch(`${API_URL}/usuarios/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsuarios(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarBitacora = async () => {
    setCargando(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (filtroUsuario) params.set('usuario', filtroUsuario);
      if (filtroFecha) params.set('fecha', filtroFecha);

      const response = await fetch(`${API_URL}/bitacora/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('No autorizado o error del servidor');
      }

      const data = await response.json();
      setRegistros(Array.isArray(data) ? data : data.results || []);
    } catch {
      setError('No se pudo cargar la bitácora de auditoría.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarBitacora();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportar = async () => {
    const params = new URLSearchParams();
    if (filtroUsuario) params.set('usuario', filtroUsuario);
    if (filtroFecha) params.set('fecha', filtroFecha);

    try {
      const response = await fetch(`${API_URL}/bitacora/export/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bitacora_auditoria.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo exportar la bitácora.');
    }
  };

  return (
    <div className="p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">BITÁCORA DE AUDITORÍA</h1>
        <div className="flex gap-3">
          <button onClick={exportar} className="bg-yellow-500 text-black px-4 py-2 rounded font-bold">
            EXPORTAR CSV
          </button>
          <button onClick={onVolver} className="bg-gray-700 px-4 py-2 rounded">
            VOLVER
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-5 bg-gray-900 p-4 rounded">
        <div>
          <label className="block text-sm mb-1">Filtrar por usuario:</label>
          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            className={inputCls}
          >
            <option value="">-- Todos --</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Filtrar por fecha:</label>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="flex items-end">
          <button onClick={cargarBitacora} className={btnCls} style={{ marginTop: 0 }}>
            APLICAR FILTROS
          </button>
        </div>
      </div>

      {cargando && <p>Cargando bitácora...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!cargando && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-800">
                <th className="p-3 text-left">Fecha y hora</th>
                <th className="p-3 text-left">Usuario</th>
                <th className="p-3 text-left">Acción</th>
                <th className="p-3 text-left">Tabla</th>
                <th className="p-3 text-left">Descripción</th>
                <th className="p-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id_bitacora} className="border-b border-gray-700">
                  <td className="p-3 whitespace-nowrap">{new Date(r.fecha_hora).toLocaleString()}</td>
                  <td className="p-3">{r.usuario_username}</td>
                  <td className="p-3">{r.accion}</td>
                  <td className="p-3">{r.tabla_afectada}</td>
                  <td className="p-3">{r.descripcion}</td>
                  <td className="p-3">{r.direccion_ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {registros.length === 0 && (
            <p className="mt-4 text-gray-400">No hay registros para los filtros seleccionados.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// 11. CU04: Registrar Expediente de Socio (rol Recepcionista/Administrador)
// ============================================================
interface PlanMembresiaItem {
  id_plan_membresia: number;
  nombre_plan: string;
  costo_base_origen: string;
  duracion_dias: number;
  estado: string;
}

const PantallaRegistrarSocio = ({ onVolver }: { onVolver: () => void }) => {
  const token = localStorage.getItem('access_token');

  const [planes, setPlanes] = useState<PlanMembresiaItem[]>([]);
  const [form, setForm] = useState({
    username: '',
    email: '',
    ci: '',
    telefono: '',
    password: '',
    password2: '',
    fecha_nacimiento: '',
    peso_inicial_kg: '',
    contacto_emerg_nombre: '',
    id_plan_membresia: '',
  });

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/planes/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPlanes((data || []).filter((p: PlanMembresiaItem) => p.estado === 'Activo')))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actualizarCampo = (campo: string, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!validarPassword(form.password)) {
      setError(
        'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.'
      );
      return;
    }
    if (form.password !== form.password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setEnviando(true);
    try {
      const payload: any = {
        username: form.username.trim(),
        email: form.email.trim(),
        ci: form.ci.trim(),
        telefono: form.telefono.trim(),
        password: form.password,
        password2: form.password2,
        fecha_nacimiento: form.fecha_nacimiento,
      };
      if (form.peso_inicial_kg) payload.peso_inicial_kg = form.peso_inicial_kg;
      if (form.contacto_emerg_nombre) payload.contacto_emerg_nombre = form.contacto_emerg_nombre;
      if (form.id_plan_membresia) payload.id_plan_membresia = Number(form.id_plan_membresia);

      const response = await fetch(`${API_URL}/socios/registrar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(mensajeDeError(data));
        return;
      }

      setMensaje(
        data.plan_asignado
          ? `Socio '${data.username}' registrado con el plan '${data.plan_asignado}'.`
          : `Socio '${data.username}' registrado correctamente.`
      );

      setForm({
        username: '',
        email: '',
        ci: '',
        telefono: '',
        password: '',
        password2: '',
        fecha_nacimiento: '',
        peso_inicial_kg: '',
        contacto_emerg_nombre: '',
        id_plan_membresia: '',
      });
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="p-6 text-white max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">REGISTRAR NUEVO SOCIO</h1>
        <button onClick={onVolver} className="bg-gray-700 px-4 py-2 rounded">
          VOLVER
        </button>
      </div>

      {error && <p className="mb-4 text-red-400">{error}</p>}
      {mensaje && <p className="mb-4 text-green-400">{mensaje}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-gray-900 p-6 rounded">
        <div>
          <label className="block mb-1">Nombre de usuario:</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => actualizarCampo('username', e.target.value)}
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="block mb-1">Correo electrónico:</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => actualizarCampo('email', e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">CI:</label>
            <input
              type="text"
              value={form.ci}
              onChange={(e) => actualizarCampo('ci', e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block mb-1">Teléfono:</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => actualizarCampo('telefono', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <PasswordInput
          id="socio-password"
          label="Contraseña:"
          value={form.password}
          onChange={(v) => actualizarCampo('password', v)}
          autoComplete="new-password"
        />
        <PasswordInput
          id="socio-password2"
          label="Confirmar contraseña:"
          value={form.password2}
          onChange={(v) => actualizarCampo('password2', v)}
          autoComplete="new-password"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Fecha de nacimiento:</label>
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) => actualizarCampo('fecha_nacimiento', e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block mb-1">Peso inicial (kg) — opcional:</label>
            <input
              type="number"
              step="0.01"
              value={form.peso_inicial_kg}
              onChange={(e) => actualizarCampo('peso_inicial_kg', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block mb-1">Contacto de emergencia — opcional:</label>
          <input
            type="text"
            value={form.contacto_emerg_nombre}
            onChange={(e) => actualizarCampo('contacto_emerg_nombre', e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block mb-1">Plan de membresía inicial — opcional:</label>
          <select
            value={form.id_plan_membresia}
            onChange={(e) => actualizarCampo('id_plan_membresia', e.target.value)}
            className={inputCls}
          >
            <option value="">-- Sin plan por ahora --</option>
            {planes.map((p) => (
              <option key={p.id_plan_membresia} value={p.id_plan_membresia}>
                {p.nombre_plan} ({p.duracion_dias} días — {p.costo_base_origen})
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className={btnCls} disabled={enviando}>
          {enviando ? 'REGISTRANDO...' : 'REGISTRAR SOCIO'}
        </button>
      </form>
    </div>
  );
};

export default function App() {
  const token = localStorage.getItem('access_token');

  const [pantalla, setPantalla] = useState<'inicio' | 'usuarios' | 'bitacora' | 'registrar-socio'>('inicio');
  // Ruta del enlace de recuperación: /reset-password/{uid}/{token}/
  const matchReset = window.location.pathname.match(/^\/reset-password\/([^/]+)\/([^/]+)\/?$/);

  if (matchReset) {
    return (
      <div className="min-h-screen bg-black text-white">
        <ResetPasswordForm uid={matchReset[1]} token={matchReset[2]} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto">
      <Navbar
        pantallaActual={pantalla}
        onInicio={() => setPantalla('inicio')}
        onGestionUsuarios={() => setPantalla('usuarios')}
        onBitacora={() => setPantalla('bitacora')}
        onRegistrarSocio={() => setPantalla('registrar-socio')}
      />
      <main className="p-4">
        {!token ? (
          <AuthGate />
        ) : pantalla === 'usuarios' ? (
          <GestionUsuarios
            onVolver={() => setPantalla('inicio')}
          />
        ) : pantalla === 'bitacora' ? (
          <PantallaBitacora
            onVolver={() => setPantalla('inicio')}
          />
        ) : pantalla === 'registrar-socio' ? (
          <PantallaRegistrarSocio
            onVolver={() => setPantalla('inicio')}
          />
        ) : (
          <div>
            <h1 className="text-xl font-bold">
              BIENVENIDO AL SISTEMA PORKY GYM
            </h1>

            <p className="mt-2 text-gray-400">
              Has iniciado sesión correctamente. Ya puedes acceder a las opciones de la barra superior.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}