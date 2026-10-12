import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { CUENTAS_DEMO, inicializarDatos } from '../data/seed'
import { destinoTrasLogin } from '../utils/constantes'
import { Alerta, Campo } from './ui'
import Icono from './Icono'

// Tarjeta de inicio de sesión. Se usa en la página de bienvenida y en /login.
export default function FormLogin({ encabezado, avisoInicial = '' }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState(avisoInicial)

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }
    setEnviando(true)
    try {
      const u = await login(form.email, form.password)
      navigate(destinoTrasLogin(location.state?.desde, u.rol), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const restablecer = async () => {
    if (!confirm('Se borrarán todos los datos guardados en este navegador y se cargarán los datos de demostración. ¿Continuar?')) return
    setEnviando(true)
    await inicializarDatos({ forzar: true })
    setEnviando(false)
    setAviso('Datos de demostración restablecidos.')
  }

  return (
    <div className="card shadow-lg border-0 w-100 acceso-tarjeta text-body">
      <form onSubmit={enviar} noValidate className="card-body p-4 d-flex flex-column gap-3">
        {encabezado}
        <Alerta tipo="info" onCerrar={() => setAviso('')}>
          {aviso}
        </Alerta>
        <Alerta>{error}</Alerta>
        <Campo label="Correo electrónico">
          {(p) => <input {...p} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nombre@correo.cl" />}
        </Campo>
        <Campo label="Contraseña">
          {(p) => <input {...p} type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
        </Campo>
        <button className="btn btn-success btn-lg w-100" disabled={enviando}>
          {enviando ? 'Verificando…' : 'Ingresar'}
        </button>
        <p className="text-center mb-0">
          ¿Eres paciente nuevo? <Link to="/registro?agendar=1">Crea tu cuenta</Link>
        </p>
      </form>

      <details className="border-top">
        <summary className="px-4 py-3 d-flex align-items-center gap-2 small fw-semibold text-body-secondary">
          <Icono nombre="usuarios" tamano={16} /> Cuentas de demostración
        </summary>
        <div className="list-group list-group-flush border-top">
          {CUENTAS_DEMO.map((c) => (
            <button key={c.email} type="button" className="list-group-item list-group-item-action px-4" onClick={() => setForm({ email: c.email, password: c.password })}>
              <strong className="d-block small">{c.rol}</strong>
              <small className="text-body-secondary text-break">
                {c.email} · {c.password}
              </small>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-top">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={restablecer} disabled={enviando}>
            Restablecer datos de demostración
          </button>
        </div>
      </details>
    </div>
  )
}
