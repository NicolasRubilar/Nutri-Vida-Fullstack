import { useApi, useAccion } from '../hooks/useApi'
import * as api from '../services/api'
import { Cargando, EncabezadoPagina, ErrorApi, Vacio } from '../components/ui'
import Icono from '../components/Icono'
import { formatoFechaHora } from '../utils/formato'

const ICONOS = { recordatorio: 'reloj', alerta: 'alerta', cita: 'calendario', plan: 'plan', progreso: 'progreso', info: 'campana' }
const COLORES = { recordatorio: 'bg-primary-subtle text-primary', alerta: 'bg-danger-subtle text-danger' }

export default function Notificaciones() {
  const { data, cargando, error, recargar } = useApi(() => api.misNotificaciones())
  const accion = useAccion()

  const leer = async (ids) => {
    await accion.ejecutar(() => api.marcarNotificacionesLeidas(ids))
    recargar()
  }

  if (cargando) return <Cargando />
  if (error) return <ErrorApi error={error} />
  const sinLeer = data.filter((n) => !n.leida).length

  return (
    <>
      <EncabezadoPagina titulo="Notificaciones" descripcion={sinLeer ? `${sinLeer} sin leer` : 'Estás al día'}>
        {sinLeer > 0 && (
          <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={() => leer()}>
            <Icono nombre="check" tamano={18} /> Marcar todas como leídas
          </button>
        )}
      </EncabezadoPagina>
      {data.length ? (
        <ul className="list-group shadow-sm">
          {data.map((n) => (
            <li key={n.id} className={`list-group-item d-flex gap-3 py-3 ${n.leida ? '' : 'list-group-item-success bg-opacity-25'}`}>
              <span className={`icono-circular flex-shrink-0 ${COLORES[n.tipo] ?? 'bg-success-subtle text-success'}`}>
                <Icono nombre={ICONOS[n.tipo] ?? 'campana'} tamano={18} />
              </span>
              <div className="flex-grow-1">
                <strong>
                  {n.titulo}
                  {!n.leida && <span className="badge text-bg-success ms-2">Nueva</span>}
                </strong>
                <p className="mb-1 small">{n.mensaje}</p>
                <small className="text-body-secondary">{formatoFechaHora(n.fecha)}</small>
              </div>
              {!n.leida && (
                <button className="btn btn-link btn-sm align-self-start" onClick={() => leer([n.id])}>
                  Marcar leída
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Vacio icono="campana" titulo="No tienes notificaciones" />
      )}
    </>
  )
}
