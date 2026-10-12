import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useApi } from '../../hooks/useApi'
import * as api from '../../services/api'
import { Alerta, Cargando, EncabezadoPagina, ErrorApi, EstadoCita, Vacio } from '../../components/ui'
import { ModalCancelarCita, ModalDetalleCita, ModalHorarioCita, ModalSolicitarCita } from '../../components/CitaFormularios'
import Icono from '../../components/Icono'
import { ESTADOS_CITA } from '../../utils/constantes'
import { formatoFecha, formatoFechaLarga, hoyISO } from '../../utils/formato'

const ACTIVAS = [ESTADOS_CITA.PENDIENTE, ESTADOS_CITA.CONFIRMADA]

export default function MisCitas() {
  const [params, setParams] = useSearchParams()
  const { data, cargando, error, recargar } = useApi(async () => {
    const [citas, perfil] = await Promise.all([api.listarCitas(), api.miPerfilPaciente()])
    return { citas, perfil }
  })
  const [aviso, setAviso] = useState('')
  const [modal, setModal] = useState({ tipo: params.get('nueva') ? 'nueva' : null, cita: null })

  const cerrar = () => {
    setModal({ tipo: null, cita: null })
    if (params.get('nueva')) setParams({}, { replace: true })
  }
  const listo = (mensaje) => {
    cerrar()
    setAviso(mensaje)
    recargar()
  }

  if (cargando) return <Cargando />
  if (error) return <ErrorApi error={error} />

  const hoy = hoyISO()
  const proximas = data.citas.filter((c) => ACTIVAS.includes(c.estado) && c.fecha >= hoy)
  const historial = data.citas.filter((c) => !proximas.includes(c)).reverse()

  return (
    <>
      <EncabezadoPagina titulo="Mis citas" descripcion="Solicita, reprograma o cancela tus horas sin llamar a la clínica.">
        <button className="btn btn-success d-inline-flex align-items-center gap-2" onClick={() => setModal({ tipo: 'nueva' })}>
          <Icono nombre="mas" tamano={18} /> Solicitar cita
        </button>
      </EncabezadoPagina>
      <div className="vstack gap-4">
        <Alerta tipo="exito" onCerrar={() => setAviso('')}>
          {aviso}
        </Alerta>

        <section>
          <h2 className="h5 mb-3">Próximas</h2>
          {proximas.length ? (
            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
              {proximas.map((c) => (
                <div className="col" key={c.id}>
                  <article className="card shadow-sm h-100">
                    <div className="card-body d-flex flex-column gap-2">
                      <div>
                        <EstadoCita estado={c.estado} requiereReprogramacion={c.requiereReprogramacion} />
                      </div>
                      <h3 className="h5 mb-0 primera-mayuscula">{formatoFechaLarga(c.fecha)}</h3>
                      <p className="d-flex align-items-center gap-2 fw-semibold text-success mb-0">
                        <Icono nombre="reloj" tamano={16} /> {c.hora} hrs
                      </p>
                      <p className="mb-0">
                        {c.nutricionista?.nombre}
                        <br />
                        <span className="text-body-secondary">{c.motivo}</span>
                      </p>
                      {c.estado === ESTADOS_CITA.PENDIENTE && !c.requiereReprogramacion && (
                        <p className="small text-body-secondary mb-0">Esperando confirmación de la clínica.</p>
                      )}
                    </div>
                    <div className="card-footer bg-body d-flex flex-wrap gap-2 align-items-center">
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => setModal({ tipo: 'reprogramar', cita: c })}>
                        Reprogramar
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => setModal({ tipo: 'cancelar', cita: c })}>
                        Cancelar
                      </button>
                      <button className="btn btn-link btn-sm" onClick={() => setModal({ tipo: 'detalle', cita: c })}>
                        Detalle
                      </button>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          ) : (
            <div className="card shadow-sm">
              <Vacio icono="calendario" titulo="No tienes citas próximas">
                Solicita una hora con tu nutricionista con el botón “Solicitar cita”.
              </Vacio>
            </div>
          )}
        </section>

        <section className="card shadow-sm">
          <div className="card-header bg-body py-3">
            <h2 className="h6 mb-0">Historial</h2>
          </div>
          {historial.length ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 tabla-movil">
                <thead className="table-light">
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Nutricionista</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>
                      <span className="visually-hidden">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((c) => (
                    <tr key={c.id}>
                      <td data-label="Fecha">{formatoFecha(c.fecha)}</td>
                      <td data-label="Hora">{c.hora}</td>
                      <td data-label="Nutricionista">{c.nutricionista?.nombre}</td>
                      <td data-label="Motivo">{c.motivo}</td>
                      <td data-label="Estado">
                        <EstadoCita estado={c.estado} />
                      </td>
                      <td>
                        <button className="btn btn-link btn-sm" onClick={() => setModal({ tipo: 'detalle', cita: c })}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="card-body text-body-secondary mb-0">Aún no hay citas anteriores.</p>
          )}
        </section>
      </div>

      {modal.tipo === 'nueva' && <ModalSolicitarCita abierto onCerrar={cerrar} onListo={listo} nutricionistaPreferido={params.get('nutri') || data.perfil?.nutricionistaId} />}
      {modal.tipo === 'reprogramar' && <ModalHorarioCita cita={modal.cita} modo="reprogramar" onCerrar={cerrar} onListo={listo} />}
      {modal.tipo === 'cancelar' && <ModalCancelarCita cita={modal.cita} onCerrar={cerrar} onListo={listo} />}
      {modal.tipo === 'detalle' && <ModalDetalleCita cita={modal.cita} onCerrar={cerrar} />}
    </>
  )
}
