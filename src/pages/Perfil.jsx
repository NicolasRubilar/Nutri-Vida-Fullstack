import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAccion, useApi } from '../hooks/useApi'
import * as api from '../services/api'
import { cambiarPassword } from '../services/auth'
import { Alerta, Campo, Cargando, EncabezadoPagina } from '../components/ui'
import { NOMBRE_ROL, ROLES } from '../utils/constantes'
import { formatearRut, hoyISO, validarPassword } from '../utils/formato'

export default function Perfil() {
  const { usuario } = useAuth()
  const esPaciente = usuario.rol === ROLES.PACIENTE
  const { data: perfil, cargando } = useApi(() => (esPaciente ? api.miPerfilPaciente() : Promise.resolve(null)), [esPaciente])

  return (
    <>
      <EncabezadoPagina titulo="Mi perfil" descripcion={`${NOMBRE_ROL[usuario.rol]} · RUT ${formatearRut(usuario.rut)}`} />
      <div className="row g-3">
        <div className="col-lg-7">{cargando ? <Cargando /> : <DatosPersonales perfil={perfil} />}</div>
        <div className="col-lg-5">
          <CambioPassword />
        </div>
      </div>
    </>
  )
}

function DatosPersonales({ perfil }) {
  const { usuario, refrescar } = useAuth()
  const [form, setForm] = useState({
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    telefono: usuario.telefono ?? '',
    fechaNacimiento: perfil?.fechaNacimiento ?? '',
    sexo: perfil?.sexo ?? '',
  })
  const [ok, setOk] = useState('')
  const { ejecutar, enviando, error, campos } = useAccion()
  const cambiar = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    setOk('')
    try {
      await ejecutar(() => api.actualizarMiPerfil(form))
      refrescar()
      setOk('Datos actualizados.')
    } catch {
      /* error visible */
    }
  }

  return (
    <form className="card shadow-sm h-100" onSubmit={enviar} noValidate>
      <div className="card-header bg-body py-3">
        <h2 className="h6 mb-0">Datos personales</h2>
      </div>
      <div className="card-body vstack gap-3">
        <Alerta tipo="exito">{ok}</Alerta>
        <Alerta>{error && !Object.keys(campos).length ? error.message : null}</Alerta>
        <div className="row g-3">
          <Campo label="Nombre" error={campos.nombre} col="col-sm-6">
            {(p) => <input {...p} value={form.nombre} onChange={cambiar('nombre')} />}
          </Campo>
          <Campo label="Apellido" error={campos.apellido} col="col-sm-6">
            {(p) => <input {...p} value={form.apellido} onChange={cambiar('apellido')} />}
          </Campo>
          <Campo label="Correo" error={campos.email} col="col-sm-6">
            {(p) => <input {...p} type="email" value={form.email} onChange={cambiar('email')} />}
          </Campo>
          <Campo label="Teléfono" error={campos.telefono} col="col-sm-6">
            {(p) => <input {...p} type="tel" value={form.telefono} onChange={cambiar('telefono')} />}
          </Campo>
          {perfil && (
            <>
              <Campo label="Fecha de nacimiento" col="col-sm-6">
                {(p) => <input {...p} type="date" max={hoyISO()} value={form.fechaNacimiento} onChange={cambiar('fechaNacimiento')} />}
              </Campo>
              <Campo label="Sexo" col="col-sm-6">
                {(p) => (
                  <select {...p} value={form.sexo} onChange={cambiar('sexo')}>
                    <option value="">Prefiero no indicar</option>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                    <option value="O">Otro</option>
                  </select>
                )}
              </Campo>
            </>
          )}
        </div>
        <div className="text-end">
          <button className="btn btn-success" disabled={enviando}>
            Guardar cambios
          </button>
        </div>
      </div>
    </form>
  )
}

function CambioPassword() {
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [ok, setOk] = useState('')
  const [local, setLocal] = useState('')
  const { ejecutar, enviando, error } = useAccion()
  const faltas = validarPassword(form.nueva)

  const enviar = async (e) => {
    e.preventDefault()
    setOk('')
    setLocal('')
    if (form.nueva !== form.confirmar) {
      setLocal('Las contraseñas nuevas no coinciden.')
      return
    }
    try {
      await ejecutar(() => cambiarPassword(form.actual, form.nueva))
      setForm({ actual: '', nueva: '', confirmar: '' })
      setOk('Contraseña actualizada. Se cerraron tus otras sesiones.')
    } catch {
      /* error visible */
    }
  }

  return (
    <form className="card shadow-sm h-100" onSubmit={enviar} noValidate>
      <div className="card-header bg-body py-3">
        <h2 className="h6 mb-0">Cambiar contraseña</h2>
      </div>
      <div className="card-body vstack gap-3">
        <Alerta tipo="exito">{ok}</Alerta>
        <Alerta>{local || error?.message}</Alerta>
        <Campo label="Contraseña actual">
          {(p) => <input {...p} type="password" autoComplete="current-password" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} />}
        </Campo>
        <Campo label="Nueva contraseña" ayuda={form.nueva && faltas.length ? `Falta: ${faltas.join(', ')}` : 'Mínimo 8 caracteres, con mayúscula, minúscula y número.'}>
          {(p) => <input {...p} type="password" autoComplete="new-password" value={form.nueva} onChange={(e) => setForm({ ...form, nueva: e.target.value })} />}
        </Campo>
        <Campo label="Confirmar nueva contraseña">
          {(p) => <input {...p} type="password" autoComplete="new-password" value={form.confirmar} onChange={(e) => setForm({ ...form, confirmar: e.target.value })} />}
        </Campo>
        <div className="text-end">
          <button className="btn btn-success" disabled={enviando || !form.actual || !form.nueva}>
            Actualizar contraseña
          </button>
        </div>
      </div>
    </form>
  )
}
