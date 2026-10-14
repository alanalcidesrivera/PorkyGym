// src/services/sesion.ts
// ============================================================================
// Cierre automático de sesión tras 15 minutos de inactividad REAL del usuario.
//
// Estado involucrado:
//   - access_token / refresh_token / usuario -> los administran el login y
//     src/services/api.ts (renovación JWT).
//   - sesion_ultima_actividad -> marca de tiempo (epoch ms) de la última
//     interacción del usuario, persistida en localStorage para que sea visible
//     desde todas las pestañas del mismo origen.
//
// Reglas de actividad: SOLO la interacción real (ratón, teclado, tacto,
// scroll) actualiza la marca. El foco, la visibilidad de la pestaña, las
// peticiones HTTP y la renovación del JWT NO cuentan como actividad.
//
// Coordinación entre pestañas: cuando una pestaña cierra o expira la sesión,
// elimina access_token; las demás lo detectan por el evento `storage` y
// regresan al login. Una simple renovación del access (mismo valor no nulo)
// no se interpreta como cierre.
// ============================================================================

// Límite de inactividad permitido (requisito 1).
export const LIMITE_INACTIVIDAD_MS = 15 * 60 * 1000;

// Clave persistente con la última actividad real (requisito 4).
export const CLAVE_ACTIVIDAD = 'sesion_ultima_actividad';

// Frecuencia de comprobación periódica del vencimiento (requisito 5).
const INTERVALO_COMPROBACION_MS = 30 * 1000;

// Escrituras a localStorage limitadas a 1 cada 20 s como máximo (requisito 3).
const THROTTLE_ACTIVIDAD_MS = 20 * 1000;

// Claves de autenticación que se eliminan al cerrar la sesión (requisito 7).
const CLAVES_SESION = ['access_token', 'refresh_token', 'usuario'];

// Eventos que representan actividad real del usuario (requisito 3).
const EVENTOS_ACTIVIDAD = [
  'mousemove',
  'mousedown',
  'click',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
];

let ultimaEscritura = 0;
let detener: (() => void) | null = null;

const haySesion = (): boolean => Boolean(localStorage.getItem('access_token'));

// Registra la hora actual como la marca de actividad inicial de la sesión.
export const iniciarActividad = (): void => {
  ultimaEscritura = Date.now();
  localStorage.setItem(CLAVE_ACTIVIDAD, String(ultimaEscritura));
};

// Marca actividad real, con throttling para no saturar localStorage.
const registrarActividad = (): void => {
  const ahora = Date.now();
  if (ahora - ultimaEscritura < THROTTLE_ACTIVIDAD_MS) return;
  ultimaEscritura = ahora;
  localStorage.setItem(CLAVE_ACTIVIDAD, String(ahora));
};

const estaExpirada = (marca: string | null): boolean => {
  // Sin marca: las sesiones antiguas sin este dato se inicializan en
  // comprobarVencimiento(), por lo que aquí no se considera expirada.
  if (marca === null) return false;

  // Marca que no representa un timestamp numérico finito (vacía, corrupta,
  // texto, NaN o Infinity): se trata como inválida y fuerza el cierre.
  const tiempo = Number(marca);
  if (marca.trim() === '' || !Number.isFinite(tiempo)) return true;

  const ahora = Date.now();

  // Marca en el futuro: valor inesperado que no debe extender la sesión,
  // por lo que también se considera inválida.
  if (tiempo > ahora) return true;

  // Marca numérica válida: expirada si transcurrieron al menos 15 minutos.
  return ahora - tiempo >= LIMITE_INACTIVIDAD_MS;
};

// Borra todas las claves de autenticación y la marca de actividad.
export const limpiarSesion = (): void => {
  for (const clave of CLAVES_SESION) localStorage.removeItem(clave);
  localStorage.removeItem(CLAVE_ACTIVIDAD);
};

const expirarSesion = (): void => {
  limpiarSesion();
  // Mismo mecanismo de navegación que usa el resto del proyecto para volver
  // al login (logout manual y api.ts ante fallo de refresco).
  window.location.reload();
};

// Consulta la marca persistida (no un temporizador en memoria) para detectar
// sesiones vencidas al volver a la pestaña o reabrir el sitio (requisito 4).
const comprobarVencimiento = (): void => {
  if (!haySesion()) return;

  const marca = localStorage.getItem(CLAVE_ACTIVIDAD);

  if (marca === null) {
    // Sesión creada antes de esta funcionalidad: se inicializa una sola vez.
    iniciarActividad();
    return;
  }

  if (estaExpirada(marca)) expirarSesion();
};

// El foco/visibilidad solo comprueban; nunca cuentan como actividad.
const alCambiarVisibilidad = (): void => {
  if (document.visibilityState === 'visible') comprobarVencimiento();
};

// Coordinación entre pestañas: la eliminación de access_token indica que otra
// pestaña cerró o expiró la sesión. Una renovación del access (valor no nulo)
// NO es un cierre.
const alCambiarAlmacen = (evento: StorageEvent): void => {
  if (evento.key !== 'access_token') return;
  if (evento.newValue !== null) return;

  limpiarSesion();
  window.location.reload();
};

// Inicializa el control solo con sesión autenticada. Es idempotente frente al
// doble montaje de React StrictMode y devuelve la función de limpieza con
// todos los listeners e intervalos (requisito 11).
export const iniciarSesionInactividad = (): (() => void) => {
  if (!haySesion()) return () => {};
  if (detener) return detener;

  // Comprobación inmediata al cargar: cubre el caso de reabrir el sitio
  // después de que la marca ya haya expirado.
  comprobarVencimiento();

  for (const nombre of EVENTOS_ACTIVIDAD) {
    window.addEventListener(nombre, registrarActividad, { passive: true });
  }
  window.addEventListener('focus', comprobarVencimiento);
  document.addEventListener('visibilitychange', alCambiarVisibilidad);
  window.addEventListener('storage', alCambiarAlmacen);

  const intervalo = window.setInterval(
    comprobarVencimiento,
    INTERVALO_COMPROBACION_MS
  );

  detener = () => {
    for (const nombre of EVENTOS_ACTIVIDAD) {
      window.removeEventListener(nombre, registrarActividad);
    }
    window.removeEventListener('focus', comprobarVencimiento);
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    window.removeEventListener('storage', alCambiarAlmacen);
    window.clearInterval(intervalo);
    detener = null;
  };

  return detener;
};
