// src/services/entrenamiento.service.ts
// ============================================================================
// Capa de servicios del módulo de ENTRENAMIENTO (CU17–CU20).
//
// Centraliza todas las llamadas HTTP a Django en funciones con tipos, de modo
// que los componentes nunca arman URLs a mano ni tratan `axios` directamente.
// Se apoya en la instancia compartida `api` (que ya trae el baseURL del
// backend) y adjunta el JWT en cada petición.
// ============================================================================
import api from './api';

// ---------------------------------------------------------------------------
// Tipos que calzan con los serializers del backend
// ---------------------------------------------------------------------------
export interface Ejercicio {
  id_ejercicio: number;
  nombre_ejercicio: string;
  grupo_muscular: string;
  equipo_requerido: string | null;
  zona_ubicacion: string | null;
  url_video_tecnica: string | null;
  descripcion_tecnica: string | null;
  estado: string;
  en_rutinas?: number;
}

export interface DetalleRutina {
  id_ejercicio: number;
  nombre_ejercicio?: string;
  grupo_muscular?: string;
  orden?: number;
  series: number;
  repeticiones: number;
  descanso_minutos?: string | null;
}

export interface Rutina {
  id_rutina: number;
  nombre_rutina: string;
  nivel: string;
  descripcion: string | null;
  calorias_estimadas: number | null;
  duracion_estimada_mins: number | null;
  estado: string;
  detalles: DetalleRutina[];
  total_ejercicios: number;
  total_series: number;
}

export interface MembresiaResumen {
  estado: string;
  tiene_membresia: boolean;
  plan: string | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  dias_restantes: number | null;
}

export interface AsignacionRutina {
  id_asignacion_rutina: number;
  id_socio: number;
  socio_username: string;
  socio_ci: string;
  id_rutina: number;
  rutina_nombre: string;
  id_entrenador: number | null;
  entrenador_username: string;
  fecha_asignacion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  observaciones: string | null;
  estado: string;
  membresia: MembresiaResumen;
}

export interface Turno {
  id_turno: number;
  nombre_turno: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface HorarioEntrenador {
  id_horario_entrenador?: number;
  id_turno: number;
  turno_nombre?: string;
  dia_semana: string;
  dia_semana_display?: string;
  hora_inicio?: string;
  hora_fin?: string;
}

export interface Entrenador {
  id_entrenador: number;
  username: string;
  email: string;
  ci: string;
  telefono: string;
  estado_cuenta: string;
  especialidad: string | null;
  certificado: string | null;
  biografia_profesional: string | null;
  anios_experiencia: number | null;
  red_social_link: string | null;
  estado: string;
  horarios: HorarioEntrenador[];
}

export interface SocioOption {
  id_socio: number;
  username: string;
  ci: string;
  estado_cuenta: string;
  membresia: MembresiaResumen | null;
}

// Ajuste mínimo: el serializer de socios expone el ID bajo `id_socio`.
// El tipo se declara con `any` porque DRF mezcla campos propios del modelo
// Socio con los aplanados desde la cuenta Usuario (username, ci, membresía).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocioBackend = any;

// ---------------------------------------------------------------------------
// Utilidad: adjunta el JWT leído de localStorage a la configuración de axios.
// Si no hay token, la petición viaja sin él (el backend devolverá 401 y la UI
// mostrará el mensaje de "sesión expirada").
// ---------------------------------------------------------------------------
const auth = () => {
  const token = localStorage.getItem('access_token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// Normaliza la respuesta de la lista de socios: DRF puede devolver una lista
// simple o un objeto paginado ({ results: [...] }). Esto evita que la UI tenga
// que adivinar el formato.
const comoLista = <T,>(data: T[] | { results: T[] }): T[] =>
  Array.isArray(data) ? data : data.results ?? [];

// ---------------------------------------------------------------------------
// CU17 — Ejercicios
// ---------------------------------------------------------------------------
export const listarEjercicios = async (params?: {
  grupo_muscular?: string;
  buscar?: string;
}): Promise<Ejercicio[]> => {
  const { data } = await api.get<Ejercicio[] | { results: Ejercicio[] }>(
    'ejercicios/',
    { ...auth(), params }
  );
  return comoLista<Ejercicio>(data);
};

export const listarGruposMusculares = async (): Promise<string[]> => {
  const { data } = await api.get<{ grupos: string[] }>('ejercicios/grupos/', auth());
  return data.grupos;
};

export const crearEjercicio = async (
  payload: Omit<Ejercicio, 'id_ejercicio' | 'en_rutinas'>
): Promise<Ejercicio> => {
  const { data } = await api.post<Ejercicio>('ejercicios/', payload, auth());
  return data;
};

export const actualizarEjercicio = async (
  id: number,
  payload: Partial<Omit<Ejercicio, 'id_ejercicio'>>
): Promise<Ejercicio> => {
  const { data } = await api.patch<Ejercicio>(`ejercicios/${id}/`, payload, auth());
  return data;
};

// Baja lógica: el backend no borra físicamente (queda referenciado por rutinas).
export const darDeBajaEjercicio = async (id: number): Promise<void> => {
  await api.delete(`ejercicios/${id}/`, auth());
};

// ---------------------------------------------------------------------------
// CU18 — Rutinas (con su plan de ejercicios anidado)
// ---------------------------------------------------------------------------
export const listarRutinas = async (params?: {
  nivel?: string;
  estado?: string;
  buscar?: string;
}): Promise<Rutina[]> => {
  const { data } = await api.get<Rutina[] | { results: Rutina[] }>('rutinas/', {
    ...auth(),
    params,
  });
  return comoLista<Rutina>(data);
};

// Crea la rutina junto con sus ejercicios en UNA sola petición (el serializer
// `RutinaConDetallesSerializer` valida y guarda todo de forma atómica).
export const crearRutina = async (payload: {
  nombre_rutina: string;
  nivel: string;
  descripcion?: string;
  calorias_estimadas?: number | null;
  duracion_estimada_mins?: number | null;
  ejercicios: DetalleRutina[];
}): Promise<Rutina> => {
  const { data } = await api.post<Rutina>('rutinas/', payload, auth());
  return data;
};

export const darDeBajaRutina = async (id: number): Promise<void> => {
  await api.delete(`rutinas/${id}/`, auth());
};

// Plan de ejercicios de UNA rutina (lo usa el Socio para ver su rutina
// asignada; el endpoint /rutinas/<id>/ejercicios/ devuelve la rutina y sus
// filas resueltas).
export interface PlanRutina {
  rutina: Rutina;
  ejercicios: {
    orden: number;
    id_ejercicio: number;
    nombre_ejercicio: string;
    grupo_muscular: string;
    series: number;
    repeticiones: number;
    descanso_minutos: string | null;
  }[];
}

export const obtenerPlanRutina = async (id: number): Promise<PlanRutina> => {
  const { data } = await api.get<PlanRutina>(`rutinas/${id}/ejercicios/`, auth());
  return data;
};

// ---------------------------------------------------------------------------
// CU19 — Asignación de rutinas a socios
// ---------------------------------------------------------------------------
export const listarAsignaciones = async (params?: {
  id_socio?: number;
  id_rutina?: number;
  estado?: string;
}): Promise<AsignacionRutina[]> => {
  const { data } = await api.get<AsignacionRutina[] | { results: AsignacionRutina[] }>(
    'asignaciones-rutina/',
    { ...auth(), params }
  );
  return comoLista<AsignacionRutina>(data);
};

export const asignarRutina = async (payload: {
  id_socio: number;
  id_rutina: number;
  id_entrenador?: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  observaciones?: string;
}): Promise<AsignacionRutina> => {
  const { data } = await api.post<AsignacionRutina>(
    'asignaciones-rutina/',
    payload,
    auth()
  );
  return data;
};

export const finalizarAsignacion = async (id: number): Promise<AsignacionRutina> => {
  const { data } = await api.post<AsignacionRutina>(
    `asignaciones-rutina/${id}/finalizar/`,
    {},
    auth()
  );
  return data;
};

// ---------------------------------------------------------------------------
// CU20 — Entrenadores (perfil + horarios)
// ---------------------------------------------------------------------------
export const listarEntrenadores = async (params?: {
  estado?: string;
  buscar?: string;
}): Promise<Entrenador[]> => {
  const { data } = await api.get<Entrenador[] | { results: Entrenador[] }>(
    'entrenadores/',
    { ...auth(), params }
  );
  return comoLista<Entrenador>(data);
};

// Alta completa: crea la cuenta (rol Entrenador), el perfil y sus horarios.
export const registrarEntrenador = async (payload: {
  username: string;
  email?: string;
  ci: string;
  telefono?: string;
  password: string;
  password2: string;
  especialidad?: string;
  certificado?: string;
  biografia_profesional?: string;
  anios_experiencia?: number | null;
  red_social_link?: string;
  horarios?: { id_turno: number; dia_semana: string }[];
}): Promise<Entrenador> => {
  const { data } = await api.post<{ mensaje: string; entrenador: Entrenador }>(
    'entrenadores/registrar/',
    payload,
    auth()
  );
  return data.entrenador;
};

export const actualizarEntrenador = async (
  id: number,
  payload: Partial<Omit<Entrenador, 'id_entrenador' | 'horarios' | 'username' | 'email' | 'ci' | 'telefono' | 'estado_cuenta'>>
): Promise<Entrenador> => {
  const { data } = await api.patch<Entrenador>(`entrenadores/${id}/`, payload, auth());
  return data;
};

export const darDeBajaEntrenador = async (id: number): Promise<void> => {
  await api.delete(`entrenadores/${id}/`, auth());
};

// Reactiva un entrenador dado de baja: operación inversa de la baja lógica.
// El backend expone la acción como POST /entrenadores/<id>/activar/.
export const activarEntrenador = async (id: number): Promise<Entrenador> => {
  const { data } = await api.post<Entrenador>(`entrenadores/${id}/activar/`, {}, auth());
  return data;
};

export const listarTurnos = async (): Promise<Turno[]> => {
  const { data } = await api.get<Turno[] | { results: Turno[] }>('turnos/', auth());
  return comoLista<Turno>(data);
};

// ---------------------------------------------------------------------------
// Apoyo (CU19): lista de socios para el selector, con su membresía.
// El backend ya expone `membresia` dentro de cada socio, de modo que la UI
// puede mostrar de inmediato quién tiene la membresía vigente.
// ---------------------------------------------------------------------------
export const listarSocios = async (): Promise<SocioOption[]> => {
  const { data } = await api.get<SocioBackend[] | { results: SocioBackend[] }>(
    'socios/',
    auth()
  );
  return comoLista<SocioBackend>(data).map((socio) => ({
    id_socio: socio.id_socio,
    username: socio.username ?? '',
    ci: socio.ci ?? '',
    estado_cuenta: socio.estado_cuenta ?? '',
    membresia: socio.membresia ?? null,
  }));
};
