// src/components/EntrenamientoScreen.tsx
// ============================================================================
// Módulo de ENTRENAMIENTO — CU17, CU18, CU19 y CU20.
//
//   CU17  Registrar Ejercicio            → pestaña «Ejercicios»
//   CU18  Diseñar Rutina de Entrenamiento→ pestaña «Rutinas»
//   CU19  Asignar Rutina a Socio         → pestaña «Asignar rutina»
//   CU20  Gestionar Perfil de Entrenador → pestaña «Entrenadores»
//
// Toda la comunicación con Django pasa por la capa de servicios
// (src/services/entrenamiento.service.ts), que a su vez usa la instancia
// compartida `api`. Los estilos siguen el lenguaje visual del sistema:
// fondo negro, acento amarillo (#E2FF00) y tipografía Bebas para títulos.
// ============================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Entrenador,
  Ejercicio,
  HorarioEntrenador,
  Rutina,
  AsignacionRutina,
  SocioOption,
  Turno,
  DetalleRutina,
  PlanRutina,
} from '../services/entrenamiento.service';
import * as svc from '../services/entrenamiento.service';

// ---------------------------------------------------------------------------
// Estilos compartidos (consistentes con el resto de la aplicación)
// ---------------------------------------------------------------------------
const inputCls =
  'w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-yellow-500 outline-none';
const btnPrincipal =
  'bg-yellow-500 text-black px-4 py-2 rounded font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecundario = 'bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 transition-colors';
const btnPeligro = 'bg-red-600 px-3 py-1 rounded hover:bg-red-500 transition-colors';
const tarjeta = 'bg-gray-900 border border-gray-700 p-5 rounded';

const NIVELES = ['Principiante', 'Intermedio', 'Avanzado'];
const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

// Convierte la respuesta de DRF (puede traer errores como {campo: [msgs]})
// en un texto legible para mostrar al usuario.
const mensajeDeError = (data: unknown): string => {
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
const errorDeAxios = (err: unknown): string => {
  const respuesta = (err as { response?: { data?: unknown } }).response;
  return mensajeDeError(respuesta?.data);
};

// Roles del usuario autenticado (los guarda el login en localStorage).
// El Socio no diseña contenido: ve el módulo en modo solo lectura.
const rolesDelUsuario = () => {
  try {
    const guardado = localStorage.getItem('usuario');
    const usuario = guardado ? JSON.parse(guardado) : null;
    return {
      esEntrenador: Boolean(usuario?.es_entrenador),
      esAdministrador: Boolean(usuario?.es_administrador),
    };
  } catch {
    return { esEntrenador: false, esAdministrador: false };
  }
};

interface Props {
  onVolver: () => void;
}

type Pestana = 'ejercicios' | 'rutinas' | 'asignar' | 'entrenadores' | 'mis-rutinas';

export const EntrenamientoScreen: React.FC<Props> = ({ onVolver }) => {
  const { esEntrenador, esAdministrador } = rolesDelUsuario();
  // Un Socio no tiene permisos de escritura (el backend lo exige), así que
  // solo ve «Mis rutinas» y el catálogo, sin formularios ni botones de alta.
  const esSocio = !esEntrenador && !esAdministrador;

  const [pestana, setPestana] = useState<Pestana>(esSocio ? 'mis-rutinas' : 'ejercicios');
  const [mensajeGlobal, setMensajeGlobal] = useState('');
  const [errorGlobal, setErrorGlobal] = useState('');

  const aviso = (texto: string) => {
    setErrorGlobal('');
    setMensajeGlobal(texto);
  };
  const fallo = (texto: string) => {
    setMensajeGlobal('');
    setErrorGlobal(texto);
  };

  const botones: { id: Pestana; etiqueta: string }[] = esSocio
    ? [
        { id: 'mis-rutinas', etiqueta: 'MIS RUTINAS' },
        { id: 'rutinas', etiqueta: 'RUTINAS DISPONIBLES' },
      ]
    : [
        { id: 'ejercicios', etiqueta: 'EJERCICIOS' },
        { id: 'rutinas', etiqueta: 'RUTINAS' },
        { id: 'asignar', etiqueta: 'ASIGNAR RUTINA' },
        { id: 'entrenadores', etiqueta: 'ENTRENADORES' },
      ];

  return (
    <div className="p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">MÓDULO DE ENTRENAMIENTO</h1>
        <button onClick={onVolver} className={btnSecundario}>
          VOLVER
        </button>
      </div>

      {/* Navegación por pestañas: una por caso de uso */}
      <div className="flex flex-wrap gap-2 mb-6">
        {botones.map((b) => (
          <button
            key={b.id}
            onClick={() => setPestana(b.id)}
            className={`px-4 py-2 rounded font-bold transition-colors ${
              pestana === b.id
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {b.etiqueta}
          </button>
        ))}
      </div>

      {mensajeGlobal && <p className="mb-4 text-green-400">{mensajeGlobal}</p>}
      {errorGlobal && <p className="mb-4 text-red-400">{errorGlobal}</p>}

      {pestana === 'ejercicios' && (
        <PestanaEjercicios onMensaje={aviso} onFallo={fallo} />
      )}
      {pestana === 'rutinas' && (
        <PestanaRutinas soloLectura={esSocio} onMensaje={aviso} onFallo={fallo} />
      )}
      {pestana === 'mis-rutinas' && <PestanaMisRutinas />}
      {pestana === 'asignar' && <PestanaAsignar onMensaje={aviso} onFallo={fallo} />}
      {pestana === 'entrenadores' && (
        <PestanaEntrenadores onMensaje={aviso} onFallo={fallo} />
      )}
    </div>
  );
};

interface PestanaProps {
  onMensaje: (t: string) => void;
  onFallo: (t: string) => void;
}

// ============================================================================
// CU17 — REGISTRAR EJERCICIO
// Alta y listado del catálogo, con filtrado por grupo muscular.
// ============================================================================
const PestanaEjercicios: React.FC<PestanaProps> = ({ onMensaje, onFallo }) => {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<Ejercicio | null>(null);

  const vacio = {
    nombre_ejercicio: '',
    grupo_muscular: '',
    equipo_requerido: '',
    zona_ubicacion: '',
    url_video_tecnica: '',
    descripcion_tecnica: '',
  };
  const [form, setForm] = useState(vacio);

  // El filtro y el texto de búsqueda se mandan al backend, que hace el
  // filtrado real (evita descargar todo el catálogo y filtrar en cliente).
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, catalogo] = await Promise.all([
        svc.listarEjercicios({
          grupo_muscular: grupoFiltro || undefined,
          buscar: busqueda || undefined,
        }),
        svc.listarGruposMusculares(),
      ]);
      setEjercicios(lista);
      setGrupos(catalogo);
    } catch {
      onFallo('No se pudieron cargar los ejercicios.');
    } finally {
      setCargando(false);
    }
  }, [grupoFiltro, busqueda, onFallo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio);
    setMostrarForm(true);
  };

  const abrirEdicion = (ejercicio: Ejercicio) => {
    setEditando(ejercicio);
    setForm({
      nombre_ejercicio: ejercicio.nombre_ejercicio,
      grupo_muscular: ejercicio.grupo_muscular ?? '',
      equipo_requerido: ejercicio.equipo_requerido ?? '',
      zona_ubicacion: ejercicio.zona_ubicacion ?? '',
      url_video_tecnica: ejercicio.url_video_tecnica ?? '',
      descripcion_tecnica: ejercicio.descripcion_tecnica ?? '',
    });
    setMostrarForm(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_ejercicio.trim()) {
      onFallo('El nombre del ejercicio es obligatorio.');
      return;
    }
    if (!form.grupo_muscular) {
      onFallo('Debe seleccionar el grupo muscular.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        nombre_ejercicio: form.nombre_ejercicio.trim(),
        grupo_muscular: form.grupo_muscular,
        equipo_requerido: form.equipo_requerido.trim() || null,
        zona_ubicacion: form.zona_ubicacion.trim() || null,
        url_video_tecnica: form.url_video_tecnica.trim() || null,
        descripcion_tecnica: form.descripcion_tecnica.trim() || null,
      };

      if (editando) {
        await svc.actualizarEjercicio(editando.id_ejercicio, payload);
        onMensaje('Ejercicio actualizado correctamente.');
      } else {
        await svc.crearEjercicio({ ...payload, estado: 'Activo' });
        onMensaje('Ejercicio registrado correctamente.');
      }

      setMostrarForm(false);
      setEditando(null);
      await cargar();
    } catch (err) {
      onFallo(errorDeAxios(err));
    } finally {
      setGuardando(false);
    }
  };

  const baja = async (ejercicio: Ejercicio) => {
    if (!window.confirm(`¿Dar de baja el ejercicio "${ejercicio.nombre_ejercicio}"?`)) return;
    try {
      await svc.darDeBajaEjercicio(ejercicio.id_ejercicio);
      onMensaje('Ejercicio dado de baja.');
      await cargar();
    } catch (err) {
      onFallo(errorDeAxios(err));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-sm mb-1">Grupo muscular</label>
          <select
            value={grupoFiltro}
            onChange={(e) => setGrupoFiltro(e.target.value)}
            className={`${inputCls} w-56`}
          >
            <option value="">Todos los grupos</option>
            {grupos.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm mb-1">Buscar</label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o equipo..."
            className={inputCls}
          />
        </div>

        <button onClick={abrirNuevo} className={btnPrincipal}>
          + NUEVO EJERCICIO
        </button>
      </div>

      {mostrarForm && (
        <div className={`${tarjeta} mb-6`}>
          <h2 className="text-2xl font-bold mb-4">
            {editando ? 'EDITAR EJERCICIO' : 'NUEVO EJERCICIO'}
          </h2>
          <form onSubmit={guardar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Nombre *</label>
              <input
                type="text"
                value={form.nombre_ejercicio}
                onChange={(e) => setForm({ ...form, nombre_ejercicio: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="block mb-1">Grupo muscular *</label>
              <select
                value={form.grupo_muscular}
                onChange={(e) => setForm({ ...form, grupo_muscular: e.target.value })}
                className={inputCls}
                required
              >
                <option value="">Seleccione...</option>
                {grupos.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Equipo requerido</label>
              <input
                type="text"
                value={form.equipo_requerido}
                onChange={(e) => setForm({ ...form, equipo_requerido: e.target.value })}
                className={inputCls}
                placeholder="Barra, mancuernas, máquina..."
              />
            </div>

            <div>
              <label className="block mb-1">Zona / ubicación</label>
              <input
                type="text"
                value={form.zona_ubicacion}
                onChange={(e) => setForm({ ...form, zona_ubicacion: e.target.value })}
                className={inputCls}
                placeholder="Zona A, área de pesas libres..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1">URL del video de técnica</label>
              <input
                type="url"
                value={form.url_video_tecnica}
                onChange={(e) => setForm({ ...form, url_video_tecnica: e.target.value })}
                className={inputCls}
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1">Descripción técnica</label>
              <textarea
                value={form.descripcion_tecnica}
                onChange={(e) => setForm({ ...form, descripcion_tecnica: e.target.value })}
                className={inputCls}
                rows={2}
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={guardando} className={btnPrincipal}>
                {guardando ? 'GUARDANDO...' : editando ? 'GUARDAR CAMBIOS' : 'REGISTRAR'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarForm(false);
                  setEditando(null);
                }}
                className={btnPeligro}
              >
                CANCELAR
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p>Cargando ejercicios...</p>
      ) : ejercicios.length === 0 ? (
        <p className="text-gray-400">
          No hay ejercicios registrados {grupoFiltro ? `en el grupo "${grupoFiltro}"` : ''}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800">
                <th className="p-3 text-left">Ejercicio</th>
                <th className="p-3 text-left">Grupo muscular</th>
                <th className="p-3 text-left">Equipo</th>
                <th className="p-3 text-left">Zona</th>
                <th className="p-3 text-left">En rutinas</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ejercicios.map((ej) => (
                <tr key={ej.id_ejercicio} className="border-b border-gray-700">
                  <td className="p-3">{ej.nombre_ejercicio}</td>
                  <td className="p-3">
                    <span className="bg-gray-800 px-2 py-1 rounded text-sm">
                      {ej.grupo_muscular}
                    </span>
                  </td>
                  <td className="p-3">{ej.equipo_requerido || '—'}</td>
                  <td className="p-3">{ej.zona_ubicacion || '—'}</td>
                  <td className="p-3">{ej.en_rutinas ?? 0}</td>
                  <td className="p-3">
                    <span className={ej.estado === 'Activo' ? 'text-green-400' : 'text-red-400'}>
                      {ej.estado}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirEdicion(ej)}
                        className="bg-blue-600 px-3 py-1 rounded"
                      >
                        EDITAR
                      </button>
                      {ej.estado === 'Activo' && (
                        <button onClick={() => baja(ej)} className={btnPeligro}>
                          BAJA
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// VISTA DEL SOCIO — MIS RUTINAS
// El Socio no diseña ni asigna: aquí ve las rutinas que le asignó su
// entrenador (el backend filtra automáticamente por el usuario autenticado)
// y puede abrir el plan de ejercicios de cada una.
// ============================================================================
const PestanaMisRutinas: React.FC = () => {
  const [asignaciones, setAsignaciones] = useState<AsignacionRutina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [falloCarga, setFalloCarga] = useState('');

  // Plan de la rutina abierta (una a la vez).
  const [planVisible, setPlanVisible] = useState<number | null>(null);
  const [plan, setPlan] = useState<PlanRutina | null>(null);
  const [cargandoPlan, setCargandoPlan] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const lista = await svc.listarAsignaciones();
        if (vivo) setAsignaciones(lista);
      } catch {
        if (vivo) setFalloCarga('No se pudieron cargar tus rutinas.');
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const verPlan = async (idRutina: number) => {
    // Si ya está abierto este plan, se cierra.
    if (planVisible === idRutina) {
      setPlanVisible(null);
      setPlan(null);
      return;
    }
    setCargandoPlan(true);
    try {
      const datos = await svc.obtenerPlanRutina(idRutina);
      setPlan(datos);
      setPlanVisible(idRutina);
    } catch {
      setFalloCarga('No se pudo cargar el plan de ejercicios.');
    } finally {
      setCargandoPlan(false);
    }
  };

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">MIS RUTINAS</h2>
      <p className="text-gray-400 mb-5">
        Rutinas que tu entrenador asignó. Cualquier cambio se gestiona con él.
      </p>

      {falloCarga && <p className="text-red-400 mb-4">{falloCarga}</p>}

      {cargando ? (
        <p>Cargando tus rutinas...</p>
      ) : asignaciones.length === 0 ? (
        <div className={tarjeta}>
          <p className="text-gray-300">Todavía no tenés rutinas asignadas.</p>
          <p className="text-gray-500 text-sm mt-2">
            Pedile a tu entrenador que te asigne una desde el módulo de entrenamiento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {asignaciones.map((a) => {
            const planDeEsta = planVisible === a.id_rutina ? plan : null;
            const vencida = Boolean(a.fecha_fin && a.fecha_fin < hoy);
            return (
              <div key={a.id_asignacion_rutina} className={tarjeta}>
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <h3 className="text-xl font-bold">{a.rutina_nombre}</h3>
                    <p className="text-yellow-400 text-sm">
                      Entrenador: {a.entrenador_username || '—'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        a.estado === 'Activa'
                          ? 'bg-green-900 text-green-300'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {a.estado}
                    </span>
                    {a.membresia && (
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          a.membresia.estado === 'Vigente'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-red-900 text-red-300'
                        }`}
                      >
                        Membresía: {a.membresia.estado}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-300">
                  <span>Asignada: {a.fecha_asignacion}</span>
                  {a.fecha_inicio && <span>Inicio: {a.fecha_inicio}</span>}
                  {a.fecha_fin && (
                    <span className={vencida ? 'text-red-400' : ''}>
                      Fin: {a.fecha_fin}
                      {vencida ? ' (vencida)' : ''}
                    </span>
                  )}
                </div>

                {a.observaciones && (
                  <p className="mt-2 text-sm text-gray-400 italic">
                    «{a.observaciones}»
                  </p>
                )}

                <div className="mt-4">
                  <button
                    onClick={() => verPlan(a.id_rutina)}
                    className={btnSecundario}
                    disabled={cargandoPlan}
                  >
                    {cargandoPlan
                      ? 'CARGANDO PLAN...'
                      : planDeEsta
                        ? 'OCULTAR PLAN'
                        : 'VER PLAN DE EJERCICIOS'}
                  </button>
                </div>

                {planDeEsta && planDeEsta.ejercicios.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-1 text-sm">
                    {planDeEsta.ejercicios.map((fila, i) => (
                      <li
                        key={fila.id_ejercicio}
                        className="flex flex-wrap justify-between gap-2 border-b border-gray-800 pb-1"
                      >
                        <span>
                          {fila.orden ?? i + 1}. {fila.nombre_ejercicio}
                          <span className="text-gray-500"> · {fila.grupo_muscular}</span>
                        </span>
                        <span className="text-gray-400">
                          {fila.series} series × {fila.repeticiones} reps
                          {fila.descanso_minutos ? ` · descanso ${fila.descanso_minutos}′` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CU18 — DISEÑAR RUTINA DE ENTRENAMIENTO
// Crea la rutina junto con su lista de ejercicios (series, repeticiones y
// descanso) en una sola petición atómica al backend.
// ============================================================================
interface FilaRutina extends DetalleRutina {
  clave: string;
}

interface PestanaRutinasProps extends PestanaProps {
  // El Socio solo consulta el catálogo: sin altas ni bajas.
  soloLectura?: boolean;
}

const PestanaRutinas: React.FC<PestanaRutinasProps> = ({ soloLectura = false, onMensaje, onFallo }) => {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nivelFiltro, setNivelFiltro] = useState('');

  const [cabecera, setCabecera] = useState({
    nombre_rutina: '',
    nivel: 'Principiante',
    descripcion: '',
    calorias_estimadas: '',
    duracion_estimada_mins: '',
  });
  const [filas, setFilas] = useState<FilaRutina[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [listaRutinas, listaEjercicios] = await Promise.all([
        svc.listarRutinas({ nivel: nivelFiltro || undefined }),
        // Para armar la rutina solo interesan los ejercicios activos.
        svc.listarEjercicios(),
      ]);
      setRutinas(listaRutinas);
      setEjercicios(listaEjercicios.filter((ej) => ej.estado === 'Activo'));
    } catch {
      onFallo('No se pudieron cargar las rutinas.');
    } finally {
      setCargando(false);
    }
  }, [nivelFiltro, onFallo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const agregarFila = () => {
    setFilas((prev) => [
      ...prev,
      {
        clave: `${Date.now()}-${prev.length}`,
        id_ejercicio: 0,
        series: 3,
        repeticiones: 10,
        descanso_minutos: '1.00',
      },
    ]);
  };

  const actualizarFila = (clave: string, cambios: Partial<FilaRutina>) => {
    setFilas((prev) => prev.map((fila) => (fila.clave === clave ? { ...fila, ...cambios } : fila)));
  };

  const quitarFila = (clave: string) => {
    setFilas((prev) => prev.filter((fila) => fila.clave !== clave));
  };

  const reiniciar = () => {
    setCabecera({
      nombre_rutina: '',
      nivel: 'Principiante',
      descripcion: '',
      calorias_estimadas: '',
      duracion_estimada_mins: '',
    });
    setFilas([]);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cabecera.nombre_rutina.trim()) {
      onFallo('El nombre de la rutina es obligatorio.');
      return;
    }
    if (filas.length === 0) {
      onFallo('La rutina debe incluir al menos un ejercicio.');
      return;
    }
    // El backend también valida duplicados, pero avisamos antes para no
    // enviar una petición que sabemos que será rechazada.
    if (filas.some((f) => !f.id_ejercicio)) {
      onFallo('Debe elegir un ejercicio en todas las filas.');
      return;
    }
    const ids = filas.map((f) => f.id_ejercicio);
    if (new Set(ids).size !== ids.length) {
      onFallo('Hay ejercicios repetidos dentro de la rutina.');
      return;
    }

    setGuardando(true);
    try {
      await svc.crearRutina({
        nombre_rutina: cabecera.nombre_rutina.trim(),
        nivel: cabecera.nivel,
        descripcion: cabecera.descripcion.trim() || undefined,
        calorias_estimadas: cabecera.calorias_estimadas ? Number(cabecera.calorias_estimadas) : null,
        duracion_estimada_mins: cabecera.duracion_estimada_mins
          ? Number(cabecera.duracion_estimada_mins)
          : null,
        ejercicios: filas.map((fila, i) => ({
          id_ejercicio: fila.id_ejercicio,
          orden: i + 1,
          series: Number(fila.series),
          repeticiones: Number(fila.repeticiones),
          descanso_minutos: fila.descanso_minutos || null,
        })),
      });

      onMensaje('Rutina diseñada y guardada correctamente.');
      setMostrarForm(false);
      reiniciar();
      await cargar();
    } catch (err) {
      onFallo(errorDeAxios(err));
    } finally {
      setGuardando(false);
    }
  };

  const baja = async (rutina: Rutina) => {
    if (!window.confirm(`¿Dar de baja la rutina "${rutina.nombre_rutina}"?`)) return;
    try {
      await svc.darDeBajaRutina(rutina.id_rutina);
      onMensaje('Rutina dada de baja.');
      await cargar();
    } catch (err) {
      onFallo(errorDeAxios(err));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-sm mb-1">Nivel</label>
          <select
            value={nivelFiltro}
            onChange={(e) => setNivelFiltro(e.target.value)}
            className={`${inputCls} w-48`}
          >
            <option value="">Todos los niveles</option>
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {!soloLectura && (
          <button
            onClick={() => {
              reiniciar();
              setMostrarForm(true);
            }}
            className={btnPrincipal}
          >
            + NUEVA RUTINA
          </button>
        )}
      </div>

      {mostrarForm && (
        <div className={`${tarjeta} mb-6`}>
          <h2 className="text-2xl font-bold mb-4">DISEÑAR RUTINA</h2>
          <form onSubmit={guardar} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block mb-1">Nombre de la rutina *</label>
                <input
                  type="text"
                  value={cabecera.nombre_rutina}
                  onChange={(e) => setCabecera({ ...cabecera, nombre_rutina: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Nivel</label>
                <select
                  value={cabecera.nivel}
                  onChange={(e) => setCabecera({ ...cabecera, nivel: e.target.value })}
                  className={inputCls}
                >
                  {NIVELES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1">Calorías estimadas</label>
                <input
                  type="number"
                  min={1}
                  value={cabecera.calorias_estimadas}
                  onChange={(e) => setCabecera({ ...cabecera, calorias_estimadas: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block mb-1">Duración (minutos)</label>
                <input
                  type="number"
                  min={1}
                  value={cabecera.duracion_estimada_mins}
                  onChange={(e) =>
                    setCabecera({ ...cabecera, duracion_estimada_mins: e.target.value })
                  }
                  className={inputCls}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block mb-1">Descripción</label>
                <textarea
                  value={cabecera.descripcion}
                  onChange={(e) => setCabecera({ ...cabecera, descripcion: e.target.value })}
                  className={inputCls}
                  rows={2}
                />
              </div>
            </div>

            {/* Plan de ejercicios de la rutina */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">EJERCICIOS DE LA RUTINA</h3>
                <button type="button" onClick={agregarFila} className={btnSecundario}>
                  + AGREGAR EJERCICIO
                </button>
              </div>

              {filas.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  Aún no agregó ejercicios. Pulse «AGREGAR EJERCICIO».
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {filas.map((fila, indice) => (
                    <div
                      key={fila.clave}
                      className="flex flex-wrap items-end gap-3 bg-gray-800 p-3 rounded"
                    >
                      <span className="text-yellow-400 font-bold">{indice + 1}.</span>

                      <div className="flex-1 min-w-[220px]">
                        <label className="block text-xs mb-1">Ejercicio</label>
                        <select
                          value={fila.id_ejercicio || ''}
                          onChange={(e) =>
                            actualizarFila(fila.clave, { id_ejercicio: Number(e.target.value) })
                          }
                          className={inputCls}
                        >
                          <option value="">Seleccione...</option>
                          {ejercicios.map((ej) => (
                            <option key={ej.id_ejercicio} value={ej.id_ejercicio}>
                              {ej.nombre_ejercicio} ({ej.grupo_muscular})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <label className="block text-xs mb-1">Series</label>
                        <input
                          type="number"
                          min={1}
                          value={fila.series}
                          onChange={(e) =>
                            actualizarFila(fila.clave, { series: Number(e.target.value) })
                          }
                          className={inputCls}
                        />
                      </div>

                      <div className="w-28">
                        <label className="block text-xs mb-1">Reps.</label>
                        <input
                          type="number"
                          min={1}
                          value={fila.repeticiones}
                          onChange={(e) =>
                            actualizarFila(fila.clave, { repeticiones: Number(e.target.value) })
                          }
                          className={inputCls}
                        />
                      </div>

                      <div className="w-28">
                        <label className="block text-xs mb-1">Descanso (min)</label>
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          value={fila.descanso_minutos ?? ''}
                          onChange={(e) =>
                            actualizarFila(fila.clave, { descanso_minutos: e.target.value })
                          }
                          className={inputCls}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => quitarFila(fila.clave)}
                        className={btnPeligro}
                      >
                        QUITAR
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={guardando} className={btnPrincipal}>
                {guardando ? 'GUARDANDO...' : 'GUARDAR RUTINA'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarForm(false);
                  reiniciar();
                }}
                className={btnPeligro}
              >
                CANCELAR
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p>Cargando rutinas...</p>
      ) : rutinas.length === 0 ? (
        <p className="text-gray-400">No hay rutinas diseñadas todavía.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rutinas.map((rutina) => (
            <div key={rutina.id_rutina} className={tarjeta}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{rutina.nombre_rutina}</h3>
                  <p className="text-yellow-400 text-sm">{rutina.nivel}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    rutina.estado === 'Activo'
                      ? 'bg-green-900 text-green-300'
                      : 'bg-red-900 text-red-300'
                  }`}
                >
                  {rutina.estado}
                </span>
              </div>

              <div className="flex gap-4 mt-3 text-sm text-gray-300">
                <span>{rutina.total_ejercicios} ejercicio(s)</span>
                <span>{rutina.total_series} series totales</span>
                {rutina.duracion_estimada_mins && <span>{rutina.duracion_estimada_mins} min</span>}
                {rutina.calorias_estimadas && <span>{rutina.calorias_estimadas} kcal</span>}
              </div>

              {rutina.descripcion && (
                <p className="mt-2 text-sm text-gray-400">{rutina.descripcion}</p>
              )}

              {rutina.detalles.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 text-sm">
                  {rutina.detalles.map((det, i) => (
                    <li key={i} className="flex justify-between border-b border-gray-800 pb-1">
                      <span>
                        {det.orden ?? i + 1}. {det.nombre_ejercicio}
                      </span>
                      <span className="text-gray-400">
                        {det.series}×{det.repeticiones}
                        {det.descanso_minutos ? ` · desc. ${det.descanso_minutos}′` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {!soloLectura && rutina.estado === 'Activo' && (
                <button onClick={() => baja(rutina)} className={`${btnPeligro} mt-3`}>
                  DAR DE BAJA
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CU19 — ASIGNAR RUTINA A SOCIO
// Antes de asignar se muestra la vigencia de la membresía del socio (el
// backend también lo valida y responde 400 si no está vigente).
// ============================================================================
const PestanaAsignar: React.FC<PestanaProps> = ({ onMensaje, onFallo }) => {
  const [asignaciones, setAsignaciones] = useState<AsignacionRutina[]>([]);
  const [socios, setSocios] = useState<SocioOption[]>([]);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [entrenadores, setEntrenadores] = useState<Entrenador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState('Activa');

  const [form, setForm] = useState({
    id_socio: '',
    id_rutina: '',
    id_entrenador: '',
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [listaAsig, listaSocios, listaRutinas, listaEnt] = await Promise.all([
        svc.listarAsignaciones({ estado: estadoFiltro || undefined }),
        svc.listarSocios(),
        svc.listarRutinas({ estado: 'Activo' }),
        svc.listarEntrenadores({ estado: 'Activo' }),
      ]);
      setAsignaciones(listaAsig);
      setSocios(listaSocios);
      setRutinas(listaRutinas);
      setEntrenadores(listaEnt);
    } catch {
      onFallo('No se pudo cargar el módulo de asignaciones.');
    } finally {
      setCargando(false);
    }
  }, [estadoFiltro, onFallo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Muestra en vivo la membresía del socio elegido, para que el operador vea
  // si está Vigente / Vencida antes de intentar la asignación.
  const socioElegido = useMemo(
    () => socios.find((s) => String(s.id_socio) === form.id_socio),
    [socios, form.id_socio]
  );

  // El Administrador no tiene perfil de Entrenador: si no elige quién firma,
  // el backend rechaza la petición. Lo avisamos antes de enviarla.
  // (Un Entrenador autenticado firma automáticamente con su propio perfil.)
  const { esEntrenador } = rolesDelUsuario();

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.id_socio) {
      onFallo('Debe seleccionar el socio.');
      return;
    }
    if (!form.id_rutina) {
      onFallo('Debe seleccionar la rutina a asignar.');
      return;
    }
    if (!form.id_entrenador && !esEntrenador) {
      onFallo('Debe indicar el entrenador que firma la asignación.');
      return;
    }
    if (socioElegido?.membresia && socioElegido.membresia.estado !== 'Vigente') {
      onFallo(
        `El socio tiene la membresía "${socioElegido.membresia.estado}": no puede recibir rutinas.`
      );
      return;
    }

    setGuardando(true);
    try {
      await svc.asignarRutina({
        id_socio: Number(form.id_socio),
        id_rutina: Number(form.id_rutina),
        id_entrenador: form.id_entrenador ? Number(form.id_entrenador) : undefined,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        observaciones: form.observaciones.trim() || undefined,
      });

      onMensaje('Rutina asignada al socio correctamente.');
      setMostrarForm(false);
      setForm({ id_socio: '', id_rutina: '', id_entrenador: '', fecha_inicio: '', fecha_fin: '', observaciones: '' });
      await cargar();
    } catch (err) {
      onFallo(errorDeAxios(err));
    } finally {
      setGuardando(false);
    }
  };

  const finalizar = async (asignacion: AsignacionRutina) => {
    if (!window.confirm('¿Finalizar esta asignación de rutina?')) return;
    try {
      await svc.finalizarAsignacion(asignacion.id_asignacion_rutina);
      onMensaje('Asignación finalizada.');
      await cargar();
    } catch (err) {
      onFallo(errorDeAxios(err));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-sm mb-1">Estado</label>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className={`${inputCls} w-48`}
          >
            <option value="">Todos</option>
            <option value="Activa">Activa</option>
            <option value="Finalizada">Finalizada</option>
          </select>
        </div>

        <button
          onClick={() => setMostrarForm(true)}
          className={btnPrincipal}
          disabled={rutinas.length === 0}
        >
          + ASIGNAR RUTINA
        </button>

        {rutinas.length === 0 && (
          <span className="text-yellow-400 text-sm">
            Primero debe diseñar una rutina.
          </span>
        )}
      </div>

      {mostrarForm && (
        <div className={`${tarjeta} mb-6`}>
          <h2 className="text-2xl font-bold mb-4">ASIGNAR RUTINA A SOCIO</h2>
          <form onSubmit={guardar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Socio *</label>
              <select
                value={form.id_socio}
                onChange={(e) => setForm({ ...form, id_socio: e.target.value })}
                className={inputCls}
                required
              >
                <option value="">Seleccione...</option>
                {socios.map((s) => (
                  <option key={s.id_socio} value={s.id_socio}>
                    {s.username} — CI {s.ci}
                  </option>
                ))}
              </select>
              {socios.length === 0 && (
                <p className="text-yellow-400 text-xs mt-1">
                  No hay socios registrados: dé de alta uno en «GESTIÓN DE
                  USUARIOS» (CU04) y contrate su membresía (CU06).
                </p>
              )}
            </div>

            {/* Estado de la membresía del socio elegido */}
            {socioElegido && (
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Membresía del socio</p>
                {socioElegido.membresia ? (
                  <>
                    <p
                      className={`font-bold ${
                        socioElegido.membresia.estado === 'Vigente'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {socioElegido.membresia.estado}
                      {socioElegido.membresia.plan ? ` — ${socioElegido.membresia.plan}` : ''}
                    </p>
                    <p className="text-sm text-gray-400">
                      Vence: {socioElegido.membresia.fecha_vencimiento || '—'}
                      {socioElegido.membresia.dias_restantes !== null &&
                        socioElegido.membresia.dias_restantes !== undefined &&
                        ` · ${socioElegido.membresia.dias_restantes} día(s) restante(s)`}
                    </p>
                  </>
                ) : (
                  <p className="font-bold text-red-400">Sin membresía registrada</p>
                )}
              </div>
            )}

            <div>
              <label className="block mb-1">Rutina *</label>
              <select
                value={form.id_rutina}
                onChange={(e) => setForm({ ...form, id_rutina: e.target.value })}
                className={inputCls}
                required
              >
                <option value="">Seleccione...</option>
                {rutinas.map((r) => (
                  <option key={r.id_rutina} value={r.id_rutina}>
                    {r.nombre_rutina} ({r.nivel} · {r.total_ejercicios} ej.)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">
                Entrenador firmante {!esEntrenador && '*'}
              </label>
              <select
                value={form.id_entrenador}
                onChange={(e) => setForm({ ...form, id_entrenador: e.target.value })}
                className={inputCls}
              >
                <option value="">
                  {esEntrenador
                    ? '(Mi perfil — firma automática)'
                    : 'Seleccione el entrenador...'}
                </option>
                {entrenadores.map((t) => (
                  <option key={t.id_entrenador} value={t.id_entrenador}>
                    {t.username}
                    {t.especialidad ? ` — ${t.especialidad}` : ''}
                  </option>
                ))}
              </select>
              {entrenadores.length === 0 && !esEntrenador && (
                <p className="text-yellow-400 text-xs mt-1">
                  No hay entrenadores activos: regístrelos primero en la pestaña
                  «ENTRENADORES».
                </p>
              )}
            </div>

            <div>
              <label className="block mb-1">Fecha de inicio</label>
              <input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block mb-1">Fecha de fin</label>
              <input
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                className={inputCls}
                rows={2}
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={guardando} className={btnPrincipal}>
                {guardando ? 'ASIGNANDO...' : 'ASIGNAR RUTINA'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className={btnPeligro}
              >
                CANCELAR
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p>Cargando asignaciones...</p>
      ) : asignaciones.length === 0 ? (
        <p className="text-gray-400">No hay asignaciones con ese estado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800">
                <th className="p-3 text-left">Socio</th>
                <th className="p-3 text-left">Rutina</th>
                <th className="p-3 text-left">Entrenador</th>
                <th className="p-3 text-left">Membresía</th>
                <th className="p-3 text-left">Asignada</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((a) => (
                <tr key={a.id_asignacion_rutina} className="border-b border-gray-700">
                  <td className="p-3">{a.socio_username}</td>
                  <td className="p-3">{a.rutina_nombre}</td>
                  <td className="p-3">{a.entrenador_username || '—'}</td>
                  <td className="p-3">
                    <span
                      className={
                        a.membresia?.estado === 'Vigente' ? 'text-green-400' : 'text-red-400'
                      }
                    >
                      {a.membresia?.estado || 'Sin membresía'}
                    </span>
                  </td>
                  <td className="p-3">{a.fecha_asignacion}</td>
                  <td className="p-3">{a.estado}</td>
                  <td className="p-3">
                    {a.estado === 'Activa' && (
                      <button onClick={() => finalizar(a)} className="bg-orange-600 px-3 py-1 rounded hover:bg-orange-500">
                        FINALIZAR
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CU20 — GESTIONAR PERFIL DE ENTRENADOR
// Alta completa (cuenta + perfil + horarios), listado y baja lógica.
// ============================================================================
const PestanaEntrenadores: React.FC<PestanaProps> = ({ onMensaje, onFallo }) => {
  const [entrenadores, setEntrenadores] = useState<Entrenador[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState('');

  const vacio = {
    username: '',
    email: '',
    ci: '',
    telefono: '',
    password: '',
    password2: '',
    especialidad: '',
    certificado: '',
    biografia_profesional: '',
    anios_experiencia: '',
    red_social_link: '',
  };
  const [form, setForm] = useState(vacio);
  // Horarios nuevos: se envían como [{id_turno, dia_semana}].
  const [horariosNuevos, setHorariosNuevos] = useState<{ id_turno: string; dia_semana: string }[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, listaTurnos] = await Promise.all([
        svc.listarEntrenadores({ estado: estadoFiltro || undefined }),
        svc.listarTurnos(),
      ]);
      setEntrenadores(lista);
      setTurnos(listaTurnos);
    } catch {
      onFallo('No se pudieron cargar los entrenadores.');
    } finally {
      setCargando(false);
    }
  }, [estadoFiltro, onFallo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const agregarHorario = () => {
    setHorariosNuevos((prev) => [...prev, { id_turno: '', dia_semana: DIAS[0] }]);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.username.trim() || !form.ci.trim()) {
      onFallo('Usuario y CI son obligatorios.');
      return;
    }
    if (form.password.length < 8) {
      onFallo('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (form.password !== form.password2) {
      onFallo('Las contraseñas no coinciden.');
      return;
    }

    const horarios = horariosNuevos
      .filter((h) => h.id_turno)
      .map((h) => ({ id_turno: Number(h.id_turno), dia_semana: h.dia_semana }));

    setGuardando(true);
    try {
      await svc.registrarEntrenador({
        username: form.username.trim(),
        email: form.email.trim() || undefined,
        ci: form.ci.trim(),
        telefono: form.telefono.trim() || undefined,
        password: form.password,
        password2: form.password2,
        especialidad: form.especialidad.trim() || undefined,
        certificado: form.certificado.trim() || undefined,
        biografia_profesional: form.biografia_profesional.trim() || undefined,
        anios_experiencia: form.anios_experiencia ? Number(form.anios_experiencia) : null,
        red_social_link: form.red_social_link.trim() || undefined,
        horarios,
      });

      onMensaje('Entrenador registrado correctamente.');
      setMostrarForm(false);
      setForm(vacio);
      setHorariosNuevos([]);
      await cargar();
    } catch (err) {
      onFallo(errorDeAxios(err));
    } finally {
      setGuardando(false);
    }
  };

  const baja = async (ent: Entrenador) => {
    if (!window.confirm(`¿Dar de baja al entrenador "${ent.username}"?`)) return;
    try {
      await svc.darDeBajaEntrenador(ent.id_entrenador);
      onMensaje('Entrenador dado de baja.');
      await cargar();
    } catch (err) {
      onFallo(errorDeAxios(err));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-sm mb-1">Estado</label>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className={`${inputCls} w-48`}
          >
            <option value="">Todos</option>
            <option value="Activo">Activos</option>
            <option value="Inactivo">Inactivos</option>
          </select>
        </div>

        <button
          onClick={() => {
            setForm(vacio);
            setHorariosNuevos([]);
            setMostrarForm(true);
          }}
          className={btnPrincipal}
        >
          + NUEVO ENTRENADOR
        </button>
      </div>

      {mostrarForm && (
        <div className={`${tarjeta} mb-6`}>
          <h2 className="text-2xl font-bold mb-4">REGISTRAR ENTRENADOR</h2>
          <form onSubmit={guardar} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1">Usuario *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Correo</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block mb-1">CI *</label>
                <input
                  type="text"
                  value={form.ci}
                  onChange={(e) => setForm({ ...form, ci: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Teléfono</label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block mb-1">Contraseña *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Repetir contraseña *</label>
                <input
                  type="password"
                  value={form.password2}
                  onChange={(e) => setForm({ ...form, password2: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Especialidad</label>
                <input
                  type="text"
                  value={form.especialidad}
                  onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
                  className={inputCls}
                  placeholder="Hipertrofia, fuerza, movilidad..."
                />
              </div>

              <div>
                <label className="block mb-1">Años de experiencia</label>
                <input
                  type="number"
                  min={0}
                  value={form.anios_experiencia}
                  onChange={(e) => setForm({ ...form, anios_experiencia: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block mb-1">Certificado</label>
                <input
                  type="text"
                  value={form.certificado}
                  onChange={(e) => setForm({ ...form, certificado: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block mb-1">Red social / portafolio</label>
                <input
                  type="url"
                  value={form.red_social_link}
                  onChange={(e) => setForm({ ...form, red_social_link: e.target.value })}
                  className={inputCls}
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-3">
                <label className="block mb-1">Biografía profesional</label>
                <textarea
                  value={form.biografia_profesional}
                  onChange={(e) => setForm({ ...form, biografia_profesional: e.target.value })}
                  className={inputCls}
                  rows={2}
                />
              </div>
            </div>

            {/* Horarios semanales */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">HORARIOS</h3>
                <button type="button" onClick={agregarHorario} className={btnSecundario}>
                  + AGREGAR HORARIO
                </button>
              </div>

              {horariosNuevos.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin horarios asignados.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {horariosNuevos.map((h, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-3 bg-gray-800 p-3 rounded">
                      <div className="w-48">
                        <label className="block text-xs mb-1">Día</label>
                        <select
                          value={h.dia_semana}
                          onChange={(e) => {
                            const copia = [...horariosNuevos];
                            copia[i] = { ...h, dia_semana: e.target.value };
                            setHorariosNuevos(copia);
                          }}
                          className={inputCls}
                        >
                          {DIAS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs mb-1">Turno</label>
                        <select
                          value={h.id_turno}
                          onChange={(e) => {
                            const copia = [...horariosNuevos];
                            copia[i] = { ...h, id_turno: e.target.value };
                            setHorariosNuevos(copia);
                          }}
                          className={inputCls}
                        >
                          <option value="">Seleccione...</option>
                          {turnos.map((t) => (
                            <option key={t.id_turno} value={t.id_turno}>
                              {t.nombre_turno} ({t.hora_inicio}–{t.hora_fin})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setHorariosNuevos((prev) => prev.filter((_, j) => j !== i))
                        }
                        className={btnPeligro}
                      >
                        QUITAR
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {turnos.length === 0 && (
                <p className="text-yellow-400 text-sm mt-2">
                  No hay turnos cargados en el sistema: pida al administrador que los cree.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={guardando} className={btnPrincipal}>
                {guardando ? 'REGISTRANDO...' : 'REGISTRAR ENTRENADOR'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className={btnPeligro}
              >
                CANCELAR
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p>Cargando entrenadores...</p>
      ) : entrenadores.length === 0 ? (
        <p className="text-gray-400">No hay entrenadores registrados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entrenadores.map((ent) => (
            <div key={ent.id_entrenador} className={tarjeta}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{ent.username}</h3>
                  <p className="text-yellow-400 text-sm">
                    {ent.especialidad || 'Sin especialidad declarada'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    ent.estado === 'Activo'
                      ? 'bg-green-900 text-green-300'
                      : 'bg-red-900 text-red-300'
                  }`}
                >
                  {ent.estado}
                </span>
              </div>

              <div className="mt-3 text-sm text-gray-300 flex flex-col gap-1">
                <span>CI: {ent.ci}</span>
                {ent.telefono && <span>Tel: {ent.telefono}</span>}
                {ent.email && <span>{ent.email}</span>}
                {ent.anios_experiencia !== null && (
                  <span>{ent.anios_experiencia} año(s) de experiencia</span>
                )}
              </div>

              {ent.biografia_profesional && (
                <p className="mt-2 text-sm text-gray-400">{ent.biografia_profesional}</p>
              )}

              {ent.horarios.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-400 mb-1">Horarios:</p>
                  <div className="flex flex-wrap gap-2">
                    {ent.horarios.map((h) => (
                      <span
                        key={h.id_horario_entrenador}
                        className="bg-gray-800 px-2 py-1 rounded text-sm"
                      >
                        {h.dia_semana_display || h.dia_semana}
                        {h.turno_nombre ? ` · ${h.turno_nombre}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ent.estado === 'Activo' && (
                <button onClick={() => baja(ent)} className={`${btnPeligro} mt-3`}>
                  DAR DE BAJA
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EntrenamientoScreen;
