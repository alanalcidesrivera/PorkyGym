// src/services/api.ts
// Instancia compartida de axios para hablar con Django.
//
// Además de la URL base, implementa la renovación automática del JWT: si el
// access token venció (el backend responde 401), se pide uno nuevo con el
// refresh token guardado en el login y se reintenta la petición original una
// sola vez. Sin esto, cada pantalla que cargaba datos dejaba de funcionar
// después de vencido el token («No se pudieron cargar los entrenadores»,
// «No se pudieron cargar los ejercicios», etc.).
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const URL_BASE = `${API_URL.replace(/\/+$/, '')}/`; // La URL de tu backend en Django

const api = axios.create({
  baseURL: URL_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Peticiones que NO deben disparar el refresco (401 legítimo: credenciales
// mal cargadas o refresh token inválido).
const esPeticionDeAuth = (url = '') =>
  url.includes('auth/login') || url.includes('auth/token/refresh');

// Evita que varias peticiones simultáneas disparen varios refresh a la vez:
// todas esperan el mismo resultado.
let renovacionEnCurso: Promise<string | null> | null = null;

const cerrarSesion = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('usuario');
};

const renovarToken = (): Promise<string | null> => {
  if (!renovacionEnCurso) {
    renovacionEnCurso = axios
      .post<{ access: string }>(`${URL_BASE}auth/token/refresh/`, {
        refresh: localStorage.getItem('refresh_token'),
      })
      .then(({ data }) => {
        localStorage.setItem('access_token', data.access);
        return data.access;
      })
      .catch(() => {
        // El refresh token también venció: no hay sesión posible.
        cerrarSesion();
        return null;
      })
      .finally(() => {
        renovacionEnCurso = null;
      });
  }
  return renovacionEnCurso;
};

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !esPeticionDeAuth(original.url) &&
      localStorage.getItem('refresh_token')
    ) {
      original._retry = true;
      const access = await renovarToken();

      if (access) {
        original.headers = { ...original.headers, Authorization: `Bearer ${access}` };
        return api(original);
      }

      // No se pudo renovar: volver a la pantalla de inicio de sesión.
      window.location.reload();
    }

    return Promise.reject(error);
  }
);

export default api;
