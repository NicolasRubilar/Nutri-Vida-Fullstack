import { cloneElement, isValidElement, useId } from 'react'
import BsModal from 'react-bootstrap/Modal'
import Icono from './Icono'
import { NOMBRE_ESTADO } from '../utils/constantes'

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-body-secondary" role="status">
      <span className="spinner-border spinner-border-sm text-success" aria-hidden="true" />
      {texto}
    </div>
  )
}

const CLASE_ALERTA = { error: 'danger', info: 'info', exito: 'success', advertencia: 'warning' }

export function Alerta({ tipo = 'error', children, onCerrar }) {
  if (!children) return null
  return (
    <div
      className={`alert alert-${CLASE_ALERTA[tipo]} d-flex align-items-start gap-2 mb-0 ${onCerrar ? 'alert-dismissible' : ''}`}
      role={tipo === 'error' ? 'alert' : 'status'}
    >
      <Icono nombre={tipo === 'exito' ? 'check' : 'alerta'} tamano={18} className="flex-shrink-0 mt-1" />
      <div>{children}</div>
      {onCerrar && <button type="button" className="btn-close" onClick={onCerrar} aria-label="Cerrar aviso" />}
    </div>
  )
}

export function ErrorApi({ error }) {
  if (!error) return null
  return <Alerta>{error.message}</Alerta>
}

export function Vacio({ icono = 'ficha', titulo, children }) {
  return (
    <div className="d-flex flex-column align-items-center gap-2 py-5 px-3 text-center text-body-secondary">
      <Icono nombre={icono} tamano={32} />
      <p className="fw-semibold text-body mb-0">{titulo}</p>
      {children && <div>{children}</div>}
    </div>
  )
}

// Campo de formulario accesible con clases de Bootstrap (form-label, form-control / form-select, is-invalid).
// `col` permite ubicarlo dentro de una grilla .row (ej: col="col-md-6").
export function Campo({ label, error, ayuda, children, col = '' }) {
  const id = useId()
  const props = { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : ayuda ? `${id}-ayuda` : undefined }
  let control = typeof children === 'function' ? children(props) : children
  if (isValidElement(control)) {
    const base = control.type === 'select' ? 'form-select' : 'form-control'
    control = cloneElement(control, { className: [base, error && 'is-invalid', control.props.className].filter(Boolean).join(' ') })
  }
  return (
    <div className={col}>
      <label htmlFor={id} className="form-label fw-semibold">
        {label}
      </label>
      {control}
      {ayuda && !error && (
        <div className="form-text" id={`${id}-ayuda`}>
          {ayuda}
        </div>
      )}
      {error && (
        <div className="invalid-feedback d-block" id={`${id}-err`}>
          {error}
        </div>
      )}
    </div>
  )
}

const CLASE_ESTADO = {
  pendiente: 'text-bg-warning',
  confirmada: 'text-bg-primary',
  cancelada: 'text-bg-secondary',
  atendida: 'text-bg-success',
  inasistencia: 'text-bg-danger',
}

export function EstadoCita({ estado, requiereReprogramacion }) {
  if (requiereReprogramacion) return <span className="badge rounded-pill text-bg-danger">Requiere reprogramación</span>
  return <span className={`badge rounded-pill ${CLASE_ESTADO[estado]}`}>{NOMBRE_ESTADO[estado]}</span>
}

export function Modal({ titulo, abierto, onCerrar, children, ancho = 560 }) {
  return (
    <BsModal show={abierto} onHide={onCerrar} centered scrollable fullscreen="sm-down" size={ancho > 600 ? 'lg' : undefined}>
      <BsModal.Header closeButton>
        <BsModal.Title as="h2" className="h5">
          {titulo}
        </BsModal.Title>
      </BsModal.Header>
      <BsModal.Body>{children}</BsModal.Body>
    </BsModal>
  )
}

// Va dentro de una fila .row (cada Stat es una columna)
export function Stat({ etiqueta, valor, detalle, icono }) {
  return (
    <div className="col">
      <div className="card h-100 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center small text-body-secondary">
            <span>{etiqueta}</span>
            {icono && <Icono nombre={icono} tamano={18} className="text-success flex-shrink-0" />}
          </div>
          <div className="fs-4 fw-bold text-break">{valor}</div>
          {detalle && <div className="small text-body-secondary">{detalle}</div>}
        </div>
      </div>
    </div>
  )
}

export function Avatar({ texto, grande = false }) {
  return (
    <span className={`avatar ${grande ? 'avatar-lg' : ''}`} aria-hidden="true">
      {texto}
    </span>
  )
}

export function EncabezadoPagina({ titulo, descripcion, children }) {
  return (
    <header className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h1 className="h2 mb-1">{titulo}</h1>
        {descripcion && <p className="text-body-secondary mb-0 primera-mayuscula">{descripcion}</p>}
      </div>
      {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
    </header>
  )
}

// Selector segmentado con nav-pills de Bootstrap
export function Segmentado({ opciones, valor, onChange, etiqueta, chico = false }) {
  return (
    <ul className={`nav nav-pills segmentado flex-nowrap ${chico ? 'segmentado-sm' : ''}`} aria-label={etiqueta}>
      {opciones.map(([k, nombre]) => (
        <li className="nav-item" key={k}>
          <button type="button" className={`nav-link ${valor === k ? 'active' : ''}`} aria-pressed={valor === k} onClick={() => onChange(k)}>
            {nombre}
          </button>
        </li>
      ))}
    </ul>
  )
}
