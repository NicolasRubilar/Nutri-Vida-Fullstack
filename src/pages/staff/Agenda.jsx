import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { useAccion, useApi } from '../../hooks/useApi'
import * as api from '../../services/api'
import { Alerta, Campo, Cargando, EncabezadoPagina, ErrorApi, EstadoCita, Modal, Segmentado, Vacio } from '../../components/ui'
import { AccionesForm, ModalCancelarCita, ModalDetalleCita, ModalHorarioCita } from '../../components/CitaFormularios'
import Icono from '../../components/Icono'
import { ESTADOS_CITA, NOMBRE_ESTADO, ROLES } from '../../utils/constantes'
import { formatoFechaLarga, hoyISO, sumarDias } from '../../utils/formato'

const RANGOS = {
  hoy: { nombre: 'Hoy', desde: 0, hasta: 0 },
  semana: { nombre: 'Próximos 7 días', desde: 0, hasta: 7 },
  mes: { nombre: 'Próximos 30 días', desde: 0, hasta: 30 },
  pasadas: { nombre: 'Últimos 30 días', desde: -30, hasta: 0 },
}

export default function Agenda() {
  const { usuario } = useAuth()
  const [params, setParams] = useSearchParams()
  const esGestion = [ROLES.ADMIN, ROLES.SECRETARIA].includes(usuario.rol)
  const rango = params.get('rango') ?? 'semana'
  const estado = params.get('estado') ?? ''
  const nutricionistaId = params.get('nutri') ?? ''
  const hoy = hoyISO()
  const r = RANGOS[rango] ?? RANGOS.semana
  const soloPendientes = estado === ESTADOS_CITA.PENDIENTE

  const { data: nutris } = useApi(() => (esGestion ? api.listarNutricionistas() : Promise.resolve([])), [esGestion])
  // Las pendientes se muestran siempre, aunque su fecha haya pasado
  const { data: citas, cargando, error, recargar } = useApi(
    () =>
      api.listarCitas({
        desde: soloPendientes ? undefined : sumarDias(hoy, r.desde),
        hasta: soloPendientes ? undefined : sumarDias(hoy, r.hasta),
        estado: estado || undefined,
        nutricionistaId: nutricionistaId || undefined,
      }),
    [rango, estado, nutricionistaId],
  )
  const [modal, setModal] = useState({ tipo: null, cita: null })
  const [aviso, setAviso] = useState('')
  const accion = useAccion()

  const filtrar = (clave, valor) => {
    const p = new URLSearchParams(params)
    if (valor) p.set(clave, valor)
    else p.delete(clave)
    setParams(p, { replace: true })
  }
  const cerrar = () => setModal({ tipo: null, cita: null })
  const listo = (mensaje) => {
    cerrar()
    setAviso(mensaje)
    recargar()
  }
  const rapido = async (fn, mensaje) => {
    try {
      await accion.ejecutar(fn)
      setAviso(mensaje)
      recargar()
    } catch {
      /* error visible arriba */
    }
  }

  const porDia = {}
  citas?.forEach((c) => (porDia[c.fecha] ??= []).push(c))

  return (
    <>
      <EncabezadoPagina
        titulo={usuario.rol === ROLES.NUTRICIONISTA ? 'Mi agenda' : 'Agenda de citas'}
        descripcion="Confirma solicitudes, reprograma, cancela y registra la asistencia."
      >
        {esGestion && (
          <button className="btn btn-outline-danger d-inline-flex align-items-center gap-2" onClick={() => setModal({ tipo: 'ausencia' })}>
            <Icono nombre="alerta" tamano={18} /> Registrar ausencia
          </button>
        )}
      </EncabezadoPagina>

      <div className="row g-2 align-items-center mb-3">
        <div className="col-12 col-xl-auto">
          <Segmentado etiqueta="Rango de fechas" valor={soloPendientes ? '' : rango} onChange={(k) => filtrar('rango', k)} opciones={Object.entries(RANGOS).map(([k, v]) => [k, v.nombre])} />
        </div>
        <div className="col-sm">
          <select className="form-select" value={estado} onChange={(e) => filtrar('estado', e.target.value)} aria-label="Estado">
            <option value="">Todos los estados</option>
            {Object.values(ESTADOS_CITA).map((e) => (
              <option key={e} value={e}>
                {NOMBRE_ESTADO[e]}
              </option>
            ))}
          </select>
        </div>
        {esGestion && (
          <div className="col-sm">
            <select className="form-select" value={nutricionistaId} onChange={(e) => filtrar('nutri', e.target.value)} aria-label="Nutricionista">
              <option value="">Todos los nutricionistas</option>
              {nutris?.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="vstack gap-3">
        <Alerta tipo="exito" onCerrar={() => setAviso('')}>
          {aviso}
        </Alerta>
        <ErrorApi error={accion.error} />
        {cargando ? (
          <Cargando />
        ) : error ? (
          <ErrorApi error={error} />
        ) : !citas.length ? (
          <div className="card shadow-sm">
            <Vacio icono="calendario" titulo="No hay citas con estos filtros" />
          </div>
        ) : (
          Object.entries(porDia).map(([fecha, lista]) => (
            <section key={fecha} className="card shadow-sm">
              <div className="card-header bg-body d-flex align-items-center gap-2 py-3">
                <h2 className="h6 mb-0 primera-mayuscula">{formatoFechaLarga(fecha)}</h2>
                {fecha === hoy && <span className="badge text-bg-success">Hoy</span>}
              </div>
              <ul className="list-group list-group-flush">
                {lista.map((c) => (
                  <li key={c.id} className="list-group-item py-3">
                    <div className="row g-2 align-items-start">
                      <div className="col-auto fw-bold pt-1" style={{ minWidth: 56, fontVariantNumeric: "tabular-nums" }}>
                        {c.hora}
                      </div>
                      <div className="col">
                        <div className="d-flex flex-wrap justify-content-between gap-2">
                          <div>
                            <strong className="d-block">{c.paciente?.nombre}</strong>
                            <small className="text-body-secondary d-block">
                              {esGestion && `${c.nutricionista?.nombre} · `}
                              {c.motivo}
                            </small>
                            {c.paciente?.telefono && <small className="text-body-secondary">{c.paciente.telefono}</small>}
                          </div>
                          <div>
                            <EstadoCita estado={c.estado} requiereReprogramacion={c.requiereReprogramacion} />
                          </div>
                        </div>
                        <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
                          {c.estado === ESTADOS_CITA.PENDIENTE && (
                            <>
                              {!c.requiereReprogramacion && c.fecha >= hoy && (
                                <button className="btn btn-success btn-sm" disabled={accion.enviando} onClick={() => rapido(() => api.confirmarCita(c.id), 'Cita confirmada y paciente notificado.')}>
                                  Confirmar
                                </button>
                              )}
                              <button className="btn btn-outline-secondary btn-sm" onClick={() => setModal({ tipo: 'confirmar', cita: c })}>
                                {c.requiereReprogramacion ? 'Asignar nuevo horario' : 'Otro horario'}
                              </button>
                            </>
                          )}
                          {c.estado === ESTADOS_CITA.CONFIRMADA && c.fecha > hoy && (
                            <button className="btn btn-outline-secondary btn-sm" onClick={() => setModal({ tipo: 'reprogramar', cita: c })}>
                              Reprogramar
                            </button>
                          )}
                          {c.estado === ESTADOS_CITA.CONFIRMADA && c.fecha <= hoy && (
                            <>
                              <button className="btn btn-success btn-sm" disabled={accion.enviando} onClick={() => rapido(() => api.marcarAsistencia(c.id, true), 'Asistencia registrada.')}>
                                Asistió
                              </button>
                              <button className="btn btn-outline-danger btn-sm" disabled={accion.enviando} onClick={() => rapido(() => api.marcarAsistencia(c.id, false), 'Inasistencia registrada.')}>
                                No asistió
                              </button>
                            </>
                          )}
                          {[ESTADOS_CITA.PENDIENTE, ESTADOS_CITA.CONFIRMADA].includes(c.estado) && (
                            <button className="btn btn-link btn-sm link-danger" onClick={() => setModal({ tipo: 'cancelar', cita: c })}>
                              Cancelar
                            </button>
                          )}
                          <button className="btn btn-link btn-sm" onClick={() => setModal({ tipo: 'detalle', cita: c })}>
                            Detalle
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {modal.tipo === 'confirmar' && <ModalHorarioCita cita={modal.cita} modo="confirmar" onCerrar={cerrar} onListo={listo} />}
      {modal.tipo === 'reprogramar' && <ModalHorarioCita cita={modal.cita} modo="reprogramar" onCerrar={cerrar} onListo={listo} />}
      {modal.tipo === 'cancelar' && <ModalCancelarCita cita={modal.cita} onCerrar={cerrar} onListo={listo} />}
      {modal.tipo === 'detalle' && <ModalDetalleCita cita={modal.cita} onCerrar={cerrar} />}
      {modal.tipo === 'ausencia' && <ModalAusencia nutris={nutris ?? []} onCerrar={cerrar} onListo={listo} />}
    </>
  )
}

function ModalAusencia({ nutris, onCerrar, onListo }) {
  const [form, setForm] = useState({ nutricionistaId: '', fecha: hoyISO() })
  const { ejecutar, enviando, error } = useAccion()
  const enviar = async (e) => {
    e.preventDefault()
    if (!form.nutricionistaId) return
    try {
      const n = await ejecutar(() => api.registrarAusencia(form.nutricionistaId, form.fecha))
      onListo(n ? `${n} paciente(s) notificados para reprogramar su cita.` : 'No había citas ese día.')
    } catch {
      /* error visible */
    }
  }
  return (
    <Modal titulo="Registrar ausencia de nutricionista" abierto onCerrar={onCerrar} ancho={480}>
      <form onSubmit={enviar} className="vstack gap-3">
        <p className="text-body-secondary mb-0">Todas las citas de ese día quedarán marcadas para reprogramar y cada paciente recibirá un aviso automático.</p>
        <Alerta>{error?.message}</Alerta>
        <Campo label="Nutricionista">
          {(p) => (
            <select {...p} required value={form.nutricionistaId} onChange={(e) => setForm({ ...form, nutricionistaId: e.target.value })}>
              <option value="">Selecciona…</option>
              {nutris.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo label="Fecha">{(p) => <input {...p} type="date" min={hoyISO()} required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />}</Campo>
        <AccionesForm onCancelar={onCerrar} textoCancelar="Volver">
          <button className="btn btn-danger" disabled={enviando || !form.nutricionistaId}>
            Registrar y notificar
          </button>
        </AccionesForm>
      </form>
    </Modal>
  )
}
