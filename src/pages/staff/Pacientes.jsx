import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { useAccion, useApi } from '../../hooks/useApi'
import * as api from '../../services/api'
import { Alerta, Campo, Cargando, EncabezadoPagina, ErrorApi, Modal, Vacio } from '../../components/ui'
import { AccionesForm } from '../../components/CitaFormularios'
import Buscador from '../../components/Buscador'
import { ROLES } from '../../utils/constantes'
import { edad, formatearRut, formatoFecha, limpiarRut } from '../../utils/formato'

export default function Pacientes() {
  const { usuario } = useAuth()
  const { data: pacientes, cargando, error, recargar } = useApi(() => api.listarPacientes())
  const [busqueda, setBusqueda] = useState('')
  const [asignando, setAsignando] = useState(null)
  const [aviso, setAviso] = useState('')

  const puedeVerFicha = [ROLES.ADMIN, ROLES.NUTRICIONISTA].includes(usuario.rol)
  const puedeAsignar = [ROLES.ADMIN, ROLES.SECRETARIA].includes(usuario.rol)
  const esSecretaria = usuario.rol === ROLES.SECRETARIA

  if (cargando) return <Cargando />
  if (error) return <ErrorApi error={error} />

  const q = busqueda.trim().toLowerCase()
  const filtrados = pacientes
    .filter(
      (p) =>
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.usuario.email.includes(q) ||
        (/\d/.test(q) && limpiarRut(p.usuario.rut).includes(limpiarRut(q))),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <>
      <EncabezadoPagina
        titulo={usuario.rol === ROLES.NUTRICIONISTA ? 'Mis pacientes' : 'Pacientes'}
        descripcion={
          usuario.rol === ROLES.NUTRICIONISTA
            ? 'Solo ves a los pacientes asignados a tu agenda.'
            : esSecretaria
              ? 'Datos de contacto y nutricionista asignado. Los datos clínicos solo los ve el nutricionista.'
              : 'Todos los pacientes de la clínica.'
        }
      />
      <div className="row g-2 align-items-center mb-3">
        <div className="col-md-8 col-lg-6">
          <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, RUT o correo" etiqueta="Buscar paciente" />
        </div>
        <div className="col-md text-body-secondary small">{filtrados.length} paciente(s)</div>
      </div>
      <div className="vstack gap-3">
        <Alerta tipo="exito" onCerrar={() => setAviso('')}>
          {aviso}
        </Alerta>
        {filtrados.length ? (
          <div className="card shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 tabla-movil">
                <thead className="table-light">
                  <tr>
                    <th>Paciente</th>
                    <th>RUT</th>
                    <th className="text-end">Edad</th>
                    <th>Contacto</th>
                    {!esSecretaria && <th className="text-end">Último peso</th>}
                    <th>Nutricionista</th>
                    <th>Próxima cita</th>
                    <th>
                      <span className="visually-hidden">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Paciente" className="fw-semibold">
                        {p.nombre}
                      </td>
                      <td data-label="RUT" className="text-nowrap">
                        {formatearRut(p.usuario.rut)}
                      </td>
                      <td data-label="Edad" className="text-end">
                        {edad(p.fechaNacimiento) ?? '—'}
                      </td>
                      <td data-label="Contacto">
                        <span className="d-flex flex-column">
                          {p.usuario.email}
                          <small className="text-body-secondary">{p.usuario.telefono}</small>
                        </span>
                      </td>
                      {!esSecretaria && (
                        <td data-label="Último peso" className="text-end">
                          {p.ultimaMedicion ? `${p.ultimaMedicion.peso} kg` : '—'}
                        </td>
                      )}
                      <td data-label="Nutricionista">{p.nutricionista?.nombre ?? <span className="text-body-secondary">Sin asignar</span>}</td>
                      <td data-label="Próxima cita">{p.proximaCita ? `${formatoFecha(p.proximaCita.fecha)} ${p.proximaCita.hora}` : '—'}</td>
                      <td className="text-nowrap">
                        {puedeVerFicha && (
                          <Link to={`/pacientes/${p.id}`} className="btn btn-outline-success btn-sm">
                            Ver ficha
                          </Link>
                        )}
                        {puedeAsignar && (
                          <button className="btn btn-link btn-sm" onClick={() => setAsignando(p)}>
                            Asignar nutricionista
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card shadow-sm">
            <Vacio icono="usuarios" titulo={q ? 'Sin resultados para la búsqueda' : 'No hay pacientes asignados'} />
          </div>
        )}
      </div>
      {asignando && (
        <ModalAsignar
          paciente={asignando}
          onCerrar={() => setAsignando(null)}
          onListo={(m) => {
            setAsignando(null)
            setAviso(m)
            recargar()
          }}
        />
      )}
    </>
  )
}

function ModalAsignar({ paciente, onCerrar, onListo }) {
  const { data: nutris } = useApi(() => api.listarNutricionistas(), [])
  const [nutricionistaId, setNutricionistaId] = useState(paciente.nutricionistaId ?? '')
  const { ejecutar, enviando, error } = useAccion()
  const enviar = async (e) => {
    e.preventDefault()
    try {
      await ejecutar(() => api.asignarNutricionista(paciente.id, nutricionistaId))
      onListo(`${paciente.nombre} quedó asignado. Su ficha e historial completos pasan al nuevo nutricionista.`)
    } catch {
      /* error visible */
    }
  }
  return (
    <Modal titulo={`Asignar nutricionista a ${paciente.nombre}`} abierto onCerrar={onCerrar} ancho={460}>
      <form onSubmit={enviar} className="vstack gap-3">
        <Alerta>{error?.message}</Alerta>
        <Campo label="Nutricionista" ayuda="El nutricionista anterior dejará de ver los datos clínicos de este paciente.">
          {(p) => (
            <select {...p} value={nutricionistaId} onChange={(e) => setNutricionistaId(e.target.value)} required>
              <option value="">Selecciona…</option>
              {nutris?.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre} — {n.especialidad}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <AccionesForm onCancelar={onCerrar} textoCancelar="Volver">
          <button className="btn btn-success" disabled={enviando || !nutricionistaId}>
            Guardar
          </button>
        </AccionesForm>
      </form>
    </Modal>
  )
}
