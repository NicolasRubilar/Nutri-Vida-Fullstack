import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAccion, useApi } from '../../hooks/useApi'
import * as api from '../../services/api'
import { Alerta, Campo, Cargando, EncabezadoPagina, ErrorApi, Modal, Vacio } from '../../components/ui'
import { AccionesForm } from '../../components/CitaFormularios'
import Buscador from '../../components/Buscador'
import Icono from '../../components/Icono'
import { ESPECIALIDADES, NOMBRE_ROL, ROLES } from '../../utils/constantes'
import { formatearRut, formatoFechaHora, hoyISO, nombreCompleto } from '../../utils/formato'

const CLASE_ROL = {
  admin: 'text-bg-dark',
  secretaria: 'text-bg-warning',
  nutricionista: 'text-bg-success',
  paciente: 'text-bg-info',
}

export default function Usuarios() {
  const { usuario: yo } = useAuth()
  const { data: usuarios, cargando, error, recargar } = useApi(() => api.listarUsuarios())
  const [filtros, setFiltros] = useState({ q: '', rol: '', estado: '' })
  const [editando, setEditando] = useState(null)
  const [aviso, setAviso] = useState('')
  const accion = useAccion()

  if (cargando) return <Cargando />
  if (error) return <ErrorApi error={error} />

  const q = filtros.q.trim().toLowerCase()
  const lista = usuarios
    .filter((u) => !q || nombreCompleto(u).toLowerCase().includes(q) || u.email.includes(q) || u.rut.toLowerCase().includes(q.replace(/[.-]/g, '')))
    .filter((u) => !filtros.rol || u.rol === filtros.rol)
    .filter((u) => !filtros.estado || (filtros.estado === 'activo') === u.activo)
    .sort((a, b) => a.rol.localeCompare(b.rol) || a.apellido.localeCompare(b.apellido))

  const cambiarEstado = async (u) => {
    if (u.activo && !confirm(`¿Desactivar la cuenta de ${nombreCompleto(u)}? No podrá iniciar sesión.`)) return
    try {
      await accion.ejecutar(() => api.cambiarEstadoUsuario(u.id, !u.activo))
      setAviso(`Cuenta de ${nombreCompleto(u)} ${u.activo ? 'desactivada' : 'activada'}.`)
      recargar()
    } catch {
      /* error visible */
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Usuarios" descripcion="Crea, edita y desactiva cuentas. Asigna el rol de cada usuario.">
        <button className="btn btn-success d-inline-flex align-items-center gap-2" onClick={() => setEditando({})}>
          <Icono nombre="mas" tamano={18} /> Nuevo usuario
        </button>
      </EncabezadoPagina>

      <div className="row g-2 mb-3">
        <div className="col-lg-6">
          <Buscador valor={filtros.q} onChange={(q) => setFiltros({ ...filtros, q })} placeholder="Nombre, correo o RUT" etiqueta="Buscar usuario" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <select className="form-select" value={filtros.rol} onChange={(e) => setFiltros({ ...filtros, rol: e.target.value })} aria-label="Rol">
            <option value="">Todos los roles</option>
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-sm-6 col-lg-3">
          <select className="form-select" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })} aria-label="Estado">
            <option value="">Activos e inactivos</option>
            <option value="activo">Solo activos</option>
            <option value="inactivo">Solo inactivos</option>
          </select>
        </div>
      </div>

      <div className="vstack gap-3">
        <Alerta tipo="exito" onCerrar={() => setAviso('')}>
          {aviso}
        </Alerta>
        <ErrorApi error={accion.error} />
        {lista.length ? (
          <div className="card shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 tabla-movil">
                <thead className="table-light">
                  <tr>
                    <th>Nombre</th>
                    <th>RUT</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Último acceso</th>
                    <th>
                      <span className="visually-hidden">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((u) => (
                    <tr key={u.id} className={u.activo ? '' : 'opacity-50'}>
                      <td data-label="Nombre">
                        <span className="d-flex flex-column">
                          <strong>{nombreCompleto(u)}</strong>
                          {u.especialidad && <small className="text-body-secondary">{u.especialidad}</small>}
                        </span>
                      </td>
                      <td data-label="RUT" className="text-nowrap">
                        {formatearRut(u.rut)}
                      </td>
                      <td data-label="Correo">{u.email}</td>
                      <td data-label="Rol">
                        <span className={`badge ${CLASE_ROL[u.rol]}`}>{NOMBRE_ROL[u.rol]}</span>
                      </td>
                      <td data-label="Estado">
                        <span className={`badge rounded-pill ${u.activo ? 'text-bg-success' : 'text-bg-secondary'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td data-label="Último acceso">{u.ultimoAcceso ? formatoFechaHora(u.ultimoAcceso) : '—'}</td>
                      <td className="text-nowrap">
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditando(u)}>
                          Editar
                        </button>
                        {u.id !== yo.id && (
                          <button className={`btn btn-link btn-sm ${u.activo ? 'link-danger' : ''}`} onClick={() => cambiarEstado(u)}>
                            {u.activo ? 'Desactivar' : 'Activar'}
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
            <Vacio icono="usuarios" titulo="No hay usuarios con esos filtros" />
          </div>
        )}
      </div>

      {editando && (
        <ModalUsuario
          usuario={editando}
          esYo={editando.id === yo.id}
          onCerrar={() => setEditando(null)}
          onListo={(m) => {
            setEditando(null)
            setAviso(m)
            recargar()
          }}
        />
      )}
    </>
  )
}

function ModalUsuario({ usuario, esYo, onCerrar, onListo }) {
  const nuevo = !usuario.id
  const [form, setForm] = useState({
    nombre: usuario.nombre ?? '',
    apellido: usuario.apellido ?? '',
    rut: usuario.rut ? formatearRut(usuario.rut) : '',
    email: usuario.email ?? '',
    telefono: usuario.telefono ?? '',
    rol: usuario.rol ?? ROLES.PACIENTE,
    especialidad: usuario.especialidad ?? '',
    fechaNacimiento: '',
    password: '',
  })
  const { ejecutar, enviando, error, campos } = useAccion()
  const cambiar = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    try {
      if (nuevo) await ejecutar(() => api.crearUsuario(form))
      else await ejecutar(() => api.actualizarUsuario(usuario.id, form))
      onListo(nuevo ? `Usuario ${form.nombre} creado.` : 'Usuario actualizado.')
    } catch {
      /* error visible */
    }
  }

  return (
    <Modal titulo={nuevo ? 'Nuevo usuario' : `Editar a ${nombreCompleto(usuario)}`} abierto onCerrar={onCerrar} ancho={640}>
      <form onSubmit={enviar} noValidate className="vstack gap-3">
        <Alerta>{error && !Object.keys(campos).length ? error.message : null}</Alerta>
        <div className="row g-3">
          <Campo label="Nombre" error={campos.nombre} col="col-md-6">
            {(p) => <input {...p} value={form.nombre} onChange={cambiar('nombre')} />}
          </Campo>
          <Campo label="Apellido" error={campos.apellido} col="col-md-6">
            {(p) => <input {...p} value={form.apellido} onChange={cambiar('apellido')} />}
          </Campo>
          <Campo label="RUT" error={campos.rut} col="col-md-6">
            {(p) => <input {...p} value={form.rut} onChange={(e) => setForm({ ...form, rut: formatearRut(e.target.value) })} />}
          </Campo>
          <Campo label="Teléfono" error={campos.telefono} col="col-md-6">
            {(p) => <input {...p} type="tel" value={form.telefono} onChange={cambiar('telefono')} />}
          </Campo>
          <Campo label="Correo" error={campos.email} col="col-12">
            {(p) => <input {...p} type="email" value={form.email} onChange={cambiar('email')} />}
          </Campo>
          <Campo label="Rol" error={campos.rol} ayuda={esYo ? 'No puedes cambiar tu propio rol.' : undefined} col="col-md-6">
            {(p) => (
              <select {...p} value={form.rol} onChange={cambiar('rol')} disabled={esYo}>
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {NOMBRE_ROL[r]}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          {form.rol === ROLES.NUTRICIONISTA && (
            <Campo label="Especialidad" error={campos.especialidad} col="col-md-6">
              {(p) => (
                <select {...p} value={form.especialidad} onChange={cambiar('especialidad')}>
                  <option value="">Selecciona…</option>
                  {ESPECIALIDADES.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              )}
            </Campo>
          )}
          {form.rol === ROLES.PACIENTE && nuevo && (
            <Campo label="Fecha de nacimiento" col="col-md-6">
              {(p) => <input {...p} type="date" max={hoyISO()} value={form.fechaNacimiento} onChange={cambiar('fechaNacimiento')} />}
            </Campo>
          )}
          <Campo
            label={nuevo ? 'Contraseña inicial' : 'Nueva contraseña'}
            error={campos.password}
            ayuda={nuevo ? 'Mínimo 8 caracteres, con mayúscula, minúscula y número.' : 'Déjala vacía para mantener la actual.'}
            col="col-12"
          >
            {(p) => <input {...p} type="password" autoComplete="new-password" value={form.password} onChange={cambiar('password')} />}
          </Campo>
        </div>
        {!nuevo && usuario.rol !== form.rol && <Alerta tipo="advertencia">Al cambiar el rol se cerrarán las sesiones abiertas de este usuario.</Alerta>}
        <AccionesForm onCancelar={onCerrar}>
          <button className="btn btn-success" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </AccionesForm>
      </form>
    </Modal>
  )
}
