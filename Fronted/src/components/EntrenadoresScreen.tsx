// src/components/EntrenadoresScreen.tsx
// ============================================================================
// CU20 — GESTIONAR PERFIL DE ENTRENADOR (pantalla propia).
//
// Este panel era la pestaña «ENTRENADORES» del módulo de entrenamiento; hoy
// es una pantalla independiente que se abre desde el menú
// «Gestión de usuarios» → «Entrenadores» (solo Administrador).
//
// El listado, el alta (cuenta + perfil + horarios) y la baja son exactamente
// los mismos de antes: la comunicación con Django pasa por
// src/services/entrenamiento.service.ts y los estilos por
// src/components/entrenamientoStyles.ts.
// ============================================================================
import React, { useCallback, useEffect, useState } from 'react';
import { Entrenador, Turno } from '../services/entrenamiento.service';
import * as svc from '../services/entrenamiento.service';
import {
  inputCls,
  btnPrincipal,
  btnSecundario,
  btnPeligro,
  btnActivar,
  tarjeta,
  DIAS,
  errorDeAxios,
} from './entrenamientoStyles';

interface PanelProps {
  onMensaje: (t: string) => void;
  onFallo: (t: string) => void;
}

// ============================================================================
// CU20 — GESTIONAR PERFIL DE ENTRENADOR
// Alta completa (cuenta + perfil + horarios), listado y baja lógica.
// ============================================================================
const PanelEntrenadores: React.FC<PanelProps> = ({ onMensaje, onFallo }) => {
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
    } catch (err) {
      // Se muestra también el motivo real (401, 403, backend caído, etc.):
      // un mensaje genérico no permite diagnosticar el problema.
      onFallo(`No se pudieron cargar los entrenadores. Detalle: ${errorDeAxios(err)}`);
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

    // Requisito del alta: todo entrenador debe tener al menos un horario
    // (día + turno: Mañana, Mediodía, Tarde o Noche).
    if (horarios.length === 0) {
      onFallo(
        'Debe asignar al menos un horario al entrenador: elija el día y el turno ' +
          '(Mañana, Mediodía, Tarde o Noche). Es un requisito para registrarlo.'
      );
      return;
    }

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

  // Operación inversa de la baja: devuelve el perfil a estado «Activo».
  const activar = async (ent: Entrenador) => {
    if (!window.confirm(`¿Reactivar al entrenador "${ent.username}"?`)) return;
    try {
      await svc.activarEntrenador(ent.id_entrenador);
      onMensaje(`Entrenador "${ent.username}" reactivado.`);
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
            // Arranca con una fila de horario lista para completar: el turno
            // es requisito y así el formulario pide día + turno desde el inicio.
            setHorariosNuevos([{ id_turno: '', dia_semana: DIAS[0] }]);
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
                <h3 className="font-bold text-lg">HORARIOS *</h3>
                <button type="button" onClick={agregarHorario} className={btnSecundario}>
                  + AGREGAR HORARIO
                </button>
              </div>

              {horariosNuevos.length === 0 ? (
                <p className="text-yellow-400 text-sm">
                  Debe agregar al menos un horario (día + turno) para poder registrar
                  el entrenador.
                </p>
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
                        <label className="block text-xs mb-1">Turno *</label>
                        <select
                          value={h.id_turno}
                          onChange={(e) => {
                            const copia = [...horariosNuevos];
                            copia[i] = { ...h, id_turno: e.target.value };
                            setHorariosNuevos(copia);
                          }}
                          className={inputCls}
                          required
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

              {ent.estado === 'Activo' ? (
                <button onClick={() => baja(ent)} className={`${btnPeligro} mt-3`}>
                  DAR DE BAJA
                </button>
              ) : (
                <button onClick={() => activar(ent)} className={`${btnActivar} mt-3`}>
                  ACTIVAR
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Pantalla: cabecera, mensajes globales y el panel de gestión de CU20.
// ---------------------------------------------------------------------------
interface Props {
  onVolver: () => void;
}

const EntrenadoresScreen: React.FC<Props> = ({ onVolver }) => {
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const aviso = (texto: string) => {
    setError('');
    setMensaje(texto);
  };
  const fallo = (texto: string) => {
    setMensaje('');
    setError(texto);
  };

  return (
    <div className="p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">GESTIÓN DE ENTRENADORES</h1>
        <button onClick={onVolver} className={btnSecundario}>
          VOLVER
        </button>
      </div>

      {mensaje && <p className="mb-4 text-green-400">{mensaje}</p>}
      {error && <p className="mb-4 text-red-400">{error}</p>}

      <PanelEntrenadores onMensaje={aviso} onFallo={fallo} />
    </div>
  );
};

export default EntrenadoresScreen;
