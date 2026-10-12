// src/components/entrenamientoStyles.ts
// ============================================================================
// Estilos y helpers compartidos por las pantallas del módulo de entrenamiento
// (EntrenamientoScreen y EntrenadoresScreen).
//
// Centralizarlos aquí garantiza que ambas vistas mantengan el mismo lenguaje
// visual: fondo negro, acento amarillo y bordes grises.
// ============================================================================

export const inputCls =
  'w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-yellow-500 outline-none';
export const btnPrincipal =
  'bg-yellow-500 text-black px-4 py-2 rounded font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const btnSecundario = 'bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 transition-colors';
export const btnPeligro = 'bg-red-600 px-3 py-1 rounded hover:bg-red-500 transition-colors';
// Acción positiva: reactivar un registro dado de baja lógica (CU20).
export const btnActivar =
  'bg-green-600 px-4 py-2 rounded font-bold hover:bg-green-500 transition-colors';
export const tarjeta = 'bg-gray-900 border border-gray-700 p-5 rounded';

// Días de la semana disponibles al cargar los horarios de un entrenador.
export const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

// Convierte la respuesta de DRF (puede traer errores como {campo: [msgs]})
// en un texto legible para mostrar al usuario.
export const mensajeDeError = (data: unknown): string => {
  if (!data) return 'Error del servidor.';
  if (typeof data === 'string') return data;
  const obj = data as Record<string, unknown>;
  if (obj.detail) return String(obj.detail);
  if (obj.error) return Array.isArray(obj.error) ? obj.error.join('. ') : String(obj.error);
  for (const clave of Object.keys(obj)) {
    const valor = obj[clave];
    if (Array.isArray(valor) && valor.length > 0) return `${clave}: ${valor.join(', ')}`;
    if (typeof valor === 'string' && valor) return `${clave}: ${valor}`;
  }
  return 'Error del servidor.';
};

// Extrae el mensaje de una respuesta de error de axios.
export const errorDeAxios = (err: unknown): string => {
  const respuesta = (err as { response?: { data?: unknown } }).response;
  return mensajeDeError(respuesta?.data);
};
