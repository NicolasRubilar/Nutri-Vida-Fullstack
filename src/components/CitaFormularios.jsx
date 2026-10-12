import { useId, useState } from 'react'
import { useAccion, useApi } from '../hooks/useApi'
import * as api from '../services/api'
import { Alerta, Campo, Cargando, EstadoCita, Modal } from './ui'
import { MOTIVOS_CONSULTA, NOMBRE_ESTADO } from '../utils/constantes'
import { esFinDeSemana, formatoFechaHora, formatoFechaLarga, hoyISO, sumarDias } from '../utils/formato'

export function AccionesForm({ onCancelar, textoCancelar = 'Cancelar', children }) {
  return (
    <div className="d-flex flex-wrap justify-content-end gap-2 pt-2">
      <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>
        {textoCancelar}
      </button>
      {children}
    </div>
  )
}

// Muestra los bloques libres del nutricionista en la fecha elegida (botones btn-check de Bootstrap)
export function SelectorHorario({ nutricionistaId, fecha, excluirCitaId, valor, onChange, error }) {
  const grupo = useId()
  const { data: libres, cargando } = useApi(
    () => (nutricionistaId && fecha ? api.horariosDisponibles(nutricionistaId, fecha, excluirCitaId) : Promise.resolve(null)),
    [nutricionistaId, fecha, excluirCitaId],
  )
  return (
    <fieldset>
      <legend className="form-label fw-semibold fs-6">Horario</legend>
      {!nutricionistaId || !fecha ? (
        <div className="form-text mt-0">Elige nutricionista y fecha para ver los horarios disponibles.</div>
      ) : esFinDeSemana(fecha) ? (
        <div className="text-danger small">La clínica atiende de lunes a viernes.</div>
      ) : cargando ? (
        <Cargando texto="Buscando horarios…" />
      ) : libres?.length ? (
        <div className="row row-cols-3 row-cols-sm-4 g-2">
          {libres.map((h) => (
            <div className="col" key={h}>
              <input type="radio" className="btn-check" name={grupo} id={`${grupo}-${h}`} value={h} checked={valor === h} onChange={() => onChange(h)} />
              <label className="btn btn-outline-success w-100" htmlFor={`${grupo}-${h}`}>
                {h}
              </label>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-danger small">No quedan horarios libres ese día. Prueba otra fecha.</div>
      )}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </fieldset>
  )
}

export function ModalSolicitarCita({ abierto, onCerrar, onListo, nutricionistaPreferido }) {
  const { data: nutris } = useApi(() => api.listarNutricionistas(), [])
  const [form, setForm] = useState({ nutricionistaId: nutricionistaPreferido ?? '', motivo: '', fecha: '', hora: '', comentario: '' })
  const { ejecutar, enviando, error, campos } = useAccion()
  const nutri = nutris?.find((n) => n.id === form.nutricionistaId)

  const enviar = async (e) => {
    e.preventDefault()
    try {
      await ejecutar(() => api.solicitarCita(form))
      onListo('Solicitud enviada. Te avisaremos cuando la clínica confirme el horario.')
    } catch {
      /* error visible en el formulario */
    }
  }

  return (
    <Modal titulo="Solicitar cita" abierto={abierto} onCerrar={onCerrar}>
      <form onSubmit={enviar} noValidate className="vstack gap-3">
        <Alerta>{error && !Object.keys(campos).length ? error.message : null}</Alerta>
        <Campo label="Nutricionista preferido" error={campos.nutricionistaId}>
          {(p) => (
            <select {...p} value={form.nutricionistaId} onChange={(e) => setForm({ ...form, nutricionistaId: e.target.value, hora: '' })}>
              <option value="">Selecciona…</option>
              {nutris?.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre} — {n.especialidad}
                </option>
              ))}
            </select>
          )}
        </Campo>
        {nutri && nutricionistaPreferido && nutri.id !== nutricionistaPreferido && (
          <Alerta tipo="info">Al confirmarse la cita, tu ficha y tu historial pasarán a {nutri.nombre}.</Alerta>
        )}
        <Campo label="Motivo de la consulta" error={campos.motivo}>
          {(p) => (
            <select {...p} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })}>
              <option value="">Selecciona…</option>
              {MOTIVOS_CONSULTA.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          )}
        </Campo>
        <Campo label="Fecha" error={campos.fecha}>
          {(p) => <input {...p} type="date" min={hoyISO()} max={sumarDias(hoyISO(), 90)} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value, hora: '' })} />}
        </Campo>
        <SelectorHorario nutricionistaId={form.nutricionistaId} fecha={form.fecha} valor={form.hora} onChange={(hora) => setForm({ ...form, hora })} error={campos.hora} />
        <Campo label="Comentario (opcional)">
          {(p) => <textarea {...p} rows={2} maxLength={300} value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })} />}
        </Campo>
        <AccionesForm onCancelar={onCerrar}>
          <button className="btn btn-success" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </AccionesForm>
      </form>
    </Modal>
  )
}

// Reprogramar (paciente o personal) y confirmar con cambio de horario (personal)
export function ModalHorarioCita({ cita, modo, onCerrar, onListo }) {
  const [fecha, setFecha] = useState(cita?.fecha ?? '')
  const [hora, setHora] = useState(modo === 'confirmar' ? cita?.hora ?? '' : '')
  const { ejecutar, enviando, error, campos } = useAccion()
  if (!cita) return null

  const enviar = async (e) => {
    e.preventDefault()
    try {
      if (modo === 'confirmar') await ejecutar(() => api.confirmarCita(cita.id, { fecha, hora }))
      else await ejecutar(() => api.reprogramarCita(cita.id, { fecha, hora }))
      onListo(modo === 'confirmar' ? 'Cita confirmada y paciente notificado.' : 'Cita reprogramada.')
    } catch {
      /* error visible */
    }
  }

  return (
    <Modal titulo={modo === 'confirmar' ? 'Confirmar cita' : 'Reprogramar cita'} abierto onCerrar={onCerrar}>
      <form onSubmit={enviar} noValidate className="vstack gap-3">
        <p className="text-body-secondary mb-0">
          {cita.paciente?.nombre} con {cita.nutricionista?.nombre}. Horario actual: {formatoFechaLarga(cita.fecha)}, {cita.hora}.
        </p>
        <Alerta>{error && !Object.keys(campos).length ? error.message : null}</Alerta>
        <Campo label="Fecha" error={campos.fecha}>
          {(p) => (
            <input
              {...p}
              type="date"
              min={hoyISO()}
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value)
                setHora('')
              }}
            />
          )}
        </Campo>
        <SelectorHorario nutricionistaId={cita.nutricionistaId} fecha={fecha} excluirCitaId={cita.id} valor={hora} onChange={setHora} error={campos.hora} />
        <AccionesForm onCancelar={onCerrar} textoCancelar="Volver">
          <button className="btn btn-success" disabled={enviando || !hora}>
            {enviando ? 'Guardando…' : modo === 'confirmar' ? 'Confirmar' : 'Guardar nuevo horario'}
          </button>
        </AccionesForm>
      </form>
    </Modal>
  )
}

export function ModalCancelarCita({ cita, onCerrar, onListo }) {
  const [motivo, setMotivo] = useState('')
  const { ejecutar, enviando, error } = useAccion()
  if (!cita) return null
  const enviar = async (e) => {
    e.preventDefault()
    try {
      await ejecutar(() => api.cancelarCita(cita.id, motivo))
      onListo('Cita cancelada.')
    } catch {
      /* error visible */
    }
  }
  return (
    <Modal titulo="Cancelar cita" abierto onCerrar={onCerrar} ancho={460}>
      <form onSubmit={enviar} className="vstack gap-3">
        <p className="mb-0">
          ¿Seguro que quieres cancelar la cita del <strong>{formatoFechaLarga(cita.fecha)}</strong> a las <strong>{cita.hora}</strong>?
        </p>
        <Alerta>{error?.message}</Alerta>
        <Campo label="Motivo (opcional)">{(p) => <input {...p} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={150} />}</Campo>
        <AccionesForm onCancelar={onCerrar} textoCancelar="Volver">
          <button className="btn btn-danger" disabled={enviando}>
            Cancelar cita
          </button>
        </AccionesForm>
      </form>
    </Modal>
  )
}

export function ModalDetalleCita({ cita, onCerrar }) {
  const { data: historial, cargando } = useApi(() => (cita ? api.historialCita(cita.id) : Promise.resolve([])), [cita?.id])
  if (!cita) return null
  const filas = [
    ['Estado', <EstadoCita key="e" estado={cita.estado} requiereReprogramacion={cita.requiereReprogramacion} />],
    ['Fecha y hora', `${formatoFechaLarga(cita.fecha)}, ${cita.hora} hrs`],
    ['Paciente', cita.paciente?.nombre],
    ['Nutricionista', `${cita.nutricionista?.nombre} (${cita.nutricionista?.especialidad})`],
    ['Motivo', cita.motivo],
    ...(cita.comentario ? [['Comentario', cita.comentario]] : []),
  ]
  return (
    <Modal titulo="Detalle de la cita" abierto onCerrar={onCerrar}>
      <dl className="row mb-4">
        {filas.map(([k, v]) => (
          <div key={k} className="col-12 d-sm-flex gap-3 mb-2">
            <dt className="col-sm-4 small text-body-secondary text-uppercase">{k}</dt>
            <dd className="col-sm-8 mb-0">{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="h6">Seguimiento</h3>
      {cargando ? (
        <Cargando />
      ) : (
        <ol className="linea-tiempo">
          {historial?.map((h) => (
            <li key={h.id}>
              <strong>{NOMBRE_ESTADO[h.estado]}</strong>
              <small className="text-body-secondary">
                {formatoFechaHora(h.fecha)} · {h.actor}
              </small>
              {h.comentario && <span>{h.comentario}</span>}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}
