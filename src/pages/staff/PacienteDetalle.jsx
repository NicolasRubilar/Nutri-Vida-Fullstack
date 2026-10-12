import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useAccion, useApi } from '../../hooks/useApi'
import * as api from '../../services/api'
import { Alerta, Avatar, Campo, Cargando, ErrorApi, EstadoCita, Modal, Vacio } from '../../components/ui'
import { AccionesForm } from '../../components/CitaFormularios'
import { GraficoProgreso, PlanesAnteriores, ResumenProgreso, TablaMediciones, VistaPlan } from '../../components/Clinico'
import Icono from '../../components/Icono'
import { COMIDAS } from '../../utils/constantes'
import { edad, formatearRut, formatoFecha, formatoFechaHora, hoyISO, iniciales } from '../../utils/formato'

const PESTANAS = [
  ['progreso', 'Progreso'],
  ['mediciones', 'Mediciones'],
  ['ficha', 'Ficha clínica'],
  ['plan', 'Plan alimenticio'],
  ['citas', 'Citas'],
]

function Tarjeta({ titulo, accion, children, sinRelleno = false }) {
  return (
    <section className="card shadow-sm">
      <div className="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
        <h2 className="h6 mb-0">{titulo}</h2>
        {accion}
      </div>
      {sinRelleno ? children : <div className="card-body">{children}</div>}
    </section>
  )
}

export default function PacienteDetalle() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const pestana = params.get('tab') ?? 'progreso'
  const [aviso, setAviso] = useState('')

  const { data, cargando, error, recargar } = useApi(async () => {
    const [paciente, ficha, mediciones, planes, citas] = await Promise.all([
      api.obtenerPaciente(id),
      api.obtenerFicha(id),
      api.listarMediciones(id),
      api.listarPlanes(id),
      api.listarCitas({ pacienteId: id }),
    ])
    return { paciente, ficha, mediciones, planes, citas }
  }, [id])

  if (cargando) return <Cargando />
  if (error)
    return (
      <div className="vstack gap-3 align-items-start">
        <ErrorApi error={error} />
        <Link to="/pacientes" className="btn btn-outline-secondary">
          Volver a pacientes
        </Link>
      </div>
    )

  const { paciente, ficha, mediciones, planes, citas } = data
  const listo = (m) => {
    setAviso(m)
    recargar()
  }

  return (
    <>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/pacientes">Pacientes</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {paciente.nombre}
          </li>
        </ol>
      </nav>
      <header className="card shadow-sm mb-3">
        <div className="card-body d-flex align-items-start gap-3">
          <Avatar texto={iniciales(paciente.usuario)} grande />
          <div className="min-w-0">
            <h1 className="h3 mb-1">{paciente.nombre}</h1>
            <p className="text-body-secondary mb-1 text-break">
              {formatearRut(paciente.usuario.rut)} · {edad(paciente.fechaNacimiento) ?? '—'} años · {paciente.usuario.telefono} · {paciente.usuario.email}
            </p>
            <p className="small mb-0">
              Nutricionista asignado: <strong>{paciente.nutricionista?.nombre ?? 'Sin asignar'}</strong>
            </p>
          </div>
        </div>
      </header>

      <ul className="nav nav-tabs flex-nowrap overflow-x-auto mb-3" role="tablist" aria-label="Secciones de la ficha">
        {PESTANAS.map(([k, nombre]) => (
          <li className="nav-item" key={k} role="presentation">
            <button role="tab" aria-selected={pestana === k} className={`nav-link text-nowrap ${pestana === k ? 'active' : ''}`} onClick={() => setParams({ tab: k }, { replace: true })}>
              {nombre}
            </button>
          </li>
        ))}
      </ul>

      <div className="vstack gap-3">
        <Alerta tipo="exito" onCerrar={() => setAviso('')}>
          {aviso}
        </Alerta>
        {pestana === 'progreso' &&
          (mediciones.length ? (
            <>
              <ResumenProgreso mediciones={mediciones} />
              <GraficoProgreso mediciones={mediciones} />
            </>
          ) : (
            <Vacio icono="progreso" titulo="Sin mediciones registradas" />
          ))}
        {pestana === 'mediciones' && <SeccionMediciones pacienteId={id} mediciones={mediciones} onListo={listo} />}
        {pestana === 'ficha' && <SeccionFicha pacienteId={id} ficha={ficha} onListo={listo} />}
        {pestana === 'plan' && <SeccionPlan pacienteId={id} planes={planes} onListo={listo} />}
        {pestana === 'citas' && <SeccionCitas citas={citas} />}
      </div>
    </>
  )
}

const MEDICION_VACIA = { fecha: hoyISO(), peso: '', talla: '', cintura: '', grasa: '', notas: '' }

function SeccionMediciones({ pacienteId, mediciones, onListo }) {
  const [editando, setEditando] = useState(null)
  const accion = useAccion()
  const ultima = mediciones.at(-1)

  const eliminar = async (m) => {
    if (!confirm(`¿Eliminar la medición del ${formatoFecha(m.fecha)}?`)) return
    try {
      await accion.ejecutar(() => api.eliminarMedicion(m.id))
      onListo('Medición eliminada.')
    } catch {
      /* error visible */
    }
  }

  return (
    <Tarjeta
      titulo="Mediciones"
      sinRelleno
      accion={
        <button className="btn btn-success btn-sm d-inline-flex align-items-center gap-1" onClick={() => setEditando({ ...MEDICION_VACIA, talla: ultima?.talla ?? '' })}>
          <Icono nombre="mas" tamano={16} /> Registrar medición
        </button>
      }
    >
      {accion.error && (
        <div className="p-3">
          <ErrorApi error={accion.error} />
        </div>
      )}
      <TablaMediciones mediciones={mediciones} onEditar={(m) => setEditando(m)} onEliminar={eliminar} />
      {editando && (
        <ModalMedicion
          pacienteId={pacienteId}
          medicion={editando}
          onCerrar={() => setEditando(null)}
          onListo={(m) => {
            setEditando(null)
            onListo(m)
          }}
        />
      )}
    </Tarjeta>
  )
}

function ModalMedicion({ pacienteId, medicion, onCerrar, onListo }) {
  const [form, setForm] = useState({ ...medicion, cintura: medicion.cintura ?? '', grasa: medicion.grasa ?? '' })
  const { ejecutar, enviando, error, campos } = useAccion()
  const cambiar = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const enviar = async (e) => {
    e.preventDefault()
    try {
      if (medicion.id) await ejecutar(() => api.actualizarMedicion(medicion.id, form))
      else await ejecutar(() => api.registrarMedicion(pacienteId, form))
      onListo(medicion.id ? 'Medición actualizada.' : 'Medición registrada. El paciente ya puede verla.')
    } catch {
      /* error visible */
    }
  }
  const num = (k, label) => (
    <Campo label={label} error={campos[k]} col="col-sm-6">
      {(p) => <input {...p} type="number" inputMode="decimal" step="0.1" value={form[k]} onChange={cambiar(k)} />}
    </Campo>
  )
  return (
    <Modal titulo={medicion.id ? 'Editar medición' : 'Registrar medición'} abierto onCerrar={onCerrar}>
      <form onSubmit={enviar} noValidate className="vstack gap-3">
        <Alerta>{error && !Object.keys(campos).length ? error.message : null}</Alerta>
        <div className="row g-3">
          <Campo label="Fecha" error={campos.fecha} col="col-sm-6">
            {(p) => <input {...p} type="date" max={hoyISO()} value={form.fecha} onChange={cambiar('fecha')} />}
          </Campo>
          {num('peso', 'Peso (kg)')}
          {num('talla', 'Talla (cm)')}
          {num('cintura', 'Cintura (cm)')}
          {num('grasa', '% de grasa corporal')}
          <Campo label="Notas" col="col-12">
            {(p) => <textarea {...p} rows={2} value={form.notas} onChange={cambiar('notas')} />}
          </Campo>
        </div>
        <AccionesForm onCancelar={onCerrar}>
          <button className="btn btn-success" disabled={enviando}>
            Guardar
          </button>
        </AccionesForm>
      </form>
    </Modal>
  )
}

const CAMPOS_FICHA = [
  ['diagnostico', 'Diagnóstico nutricional'],
  ['antecedentes', 'Antecedentes mórbidos y familiares'],
  ['alergias', 'Alergias e intolerancias'],
  ['medicamentos', 'Medicamentos'],
  ['objetivo', 'Objetivo del tratamiento'],
]

function SeccionFicha({ pacienteId, ficha, onListo }) {
  const [editando, setEditando] = useState(!ficha)
  const [form, setForm] = useState(() => Object.fromEntries(CAMPOS_FICHA.map(([k]) => [k, ficha?.[k] ?? ''])))
  const { ejecutar, enviando, error } = useAccion()

  const guardar = async (e) => {
    e.preventDefault()
    try {
      await ejecutar(() => api.guardarFicha(pacienteId, form))
      setEditando(false)
      onListo('Ficha clínica guardada.')
    } catch {
      /* error visible */
    }
  }

  return (
    <Tarjeta
      titulo="Ficha clínica"
      accion={
        !editando && (
          <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1" onClick={() => setEditando(true)}>
            <Icono nombre="editar" tamano={16} /> Editar
          </button>
        )
      }
    >
      {editando ? (
        <form onSubmit={guardar} className="vstack gap-3">
          <Alerta>{error?.message}</Alerta>
          <div className="row g-3">
            {CAMPOS_FICHA.map(([k, label]) => (
              <Campo key={k} label={label} col="col-lg-6">
                {(p) => <textarea {...p} rows={2} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
              </Campo>
            ))}
          </div>
          <div className="d-flex flex-wrap justify-content-end gap-2">
            {ficha && (
              <button type="button" className="btn btn-outline-secondary" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            )}
            <button className="btn btn-success" disabled={enviando}>
              Guardar ficha
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="row g-3 mb-3">
            {CAMPOS_FICHA.map(([k, label]) => (
              <div key={k} className="col-lg-6">
                <dt className="small text-body-secondary text-uppercase">{label}</dt>
                <dd className="mb-0">{ficha[k] || '—'}</dd>
              </div>
            ))}
          </dl>
          <p className="small text-body-secondary mb-0">
            Última actualización: {formatoFechaHora(ficha.actualizadaEn)} por {ficha.actualizadaPor}
          </p>
        </>
      )}
    </Tarjeta>
  )
}

function SeccionPlan({ pacienteId, planes, onListo }) {
  const [editando, setEditando] = useState(null)
  const vigente = planes.find((p) => p.vigente)
  return (
    <>
      <Tarjeta
        titulo="Plan vigente"
        accion={
          <div className="d-flex flex-wrap gap-2">
            {vigente && (
              <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1" onClick={() => setEditando(vigente)}>
                <Icono nombre="editar" tamano={16} /> Editar
              </button>
            )}
            <button className="btn btn-success btn-sm d-inline-flex align-items-center gap-1" onClick={() => setEditando({})}>
              <Icono nombre="mas" tamano={16} /> Nuevo plan
            </button>
          </div>
        }
      >
        {vigente ? <VistaPlan plan={vigente} /> : <Vacio icono="plan" titulo="El paciente no tiene un plan vigente" />}
      </Tarjeta>
      <PlanesAnteriores planes={planes.filter((p) => !p.vigente)} />
      {editando && (
        <ModalPlan
          pacienteId={pacienteId}
          plan={editando}
          onCerrar={() => setEditando(null)}
          onListo={(m) => {
            setEditando(null)
            onListo(m)
          }}
        />
      )}
    </>
  )
}

function ModalPlan({ pacienteId, plan, onCerrar, onListo }) {
  const [form, setForm] = useState({
    objetivo: plan.objetivo ?? '',
    calorias: plan.calorias ?? '',
    indicaciones: plan.indicaciones ?? '',
    ...Object.fromEntries(COMIDAS.map(([k]) => [k, plan[k] ?? ''])),
  })
  const { ejecutar, enviando, error, campos } = useAccion()
  const enviar = async (e) => {
    e.preventDefault()
    try {
      await ejecutar(() => api.guardarPlan(pacienteId, form, plan.id))
      onListo(plan.id ? 'Plan actualizado.' : 'Nuevo plan asignado. El paciente fue notificado.')
    } catch {
      /* error visible */
    }
  }
  return (
    <Modal titulo={plan.id ? 'Editar plan alimenticio' : 'Nuevo plan alimenticio'} abierto onCerrar={onCerrar} ancho={680}>
      <form onSubmit={enviar} noValidate className="vstack gap-3">
        <Alerta>{error && !Object.keys(campos).length ? error.message : null}</Alerta>
        {!plan.id && <Alerta tipo="info">El plan nuevo reemplazará al vigente, que quedará en el historial.</Alerta>}
        <div className="row g-3">
          <Campo label="Objetivo" error={campos.objetivo} col="col-md-8">
            {(p) => <input {...p} value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} />}
          </Campo>
          <Campo label="Calorías diarias (kcal)" error={campos.calorias} col="col-md-4">
            {(p) => <input {...p} type="number" value={form.calorias} onChange={(e) => setForm({ ...form, calorias: e.target.value })} />}
          </Campo>
          {COMIDAS.map(([k, label]) => (
            <Campo key={k} label={label} error={campos[k]} col="col-md-6">
              {(p) => <textarea {...p} rows={2} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
            </Campo>
          ))}
          <Campo label="Indicaciones generales" col="col-12">
            {(p) => <textarea {...p} rows={3} value={form.indicaciones} onChange={(e) => setForm({ ...form, indicaciones: e.target.value })} />}
          </Campo>
        </div>
        <AccionesForm onCancelar={onCerrar}>
          <button className="btn btn-success" disabled={enviando}>
            Guardar plan
          </button>
        </AccionesForm>
      </form>
    </Modal>
  )
}

function SeccionCitas({ citas }) {
  if (!citas.length) return <Vacio icono="calendario" titulo="Sin citas registradas" />
  return (
    <Tarjeta titulo="Historial de citas" sinRelleno>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 tabla-movil">
          <thead className="table-light">
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Nutricionista</th>
              <th>Motivo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {[...citas].reverse().map((c) => (
              <tr key={c.id}>
                <td data-label="Fecha">{formatoFecha(c.fecha)}</td>
                <td data-label="Hora">{c.hora}</td>
                <td data-label="Nutricionista">{c.nutricionista?.nombre}</td>
                <td data-label="Motivo">{c.motivo}</td>
                <td data-label="Estado">
                  <EstadoCita estado={c.estado} requiereReprogramacion={c.requiereReprogramacion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  )
}
