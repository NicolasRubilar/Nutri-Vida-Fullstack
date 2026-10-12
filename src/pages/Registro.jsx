import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { Alerta, Campo } from '../components/ui'
import PanelMarca from '../components/PanelMarca'
import { formatearRut, hoyISO, validarPassword } from '../utils/formato'

const VACIO = { nombre: '', apellido: '', rut: '', fechaNacimiento: '', sexo: '', email: '', telefono: '', password: '', confirmar: '' }

export default function Registro() {
  const { usuario, registrar } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Si viene desde "Agenda tu hora", al registrarse se abre directo la solicitud de cita
  const destino = params.get('agendar') ? `/mis-citas?nueva=1${params.get('nutri') ? `&nutri=${params.get('nutri')}` : ''}` : '/'
  const [form, setForm] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [acepta, setAcepta] = useState(false)

  if (usuario) return <Navigate to={destino} replace />

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  const faltas = validarPassword(form.password)

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    const locales = {}
    if (form.password !== form.confirmar) locales.confirmar = 'Las contraseñas no coinciden.'
    if (!acepta) locales.acepta = 'Debes aceptar el tratamiento de tus datos.'
    if (Object.keys(locales).length) {
      setErrores(locales)
      return
    }
    setEnviando(true)
    try {
      await registrar(form)
      navigate(destino, { replace: true })
    } catch (err) {
      setErrores(err.campos ?? {})
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <PanelMarca />
        <section className="col-md-7 col-xl-8 d-flex justify-content-center align-items-md-center py-4 px-3">
          <form onSubmit={enviar} noValidate className="card shadow-sm w-100 acceso-tarjeta acceso-ancha">
            <div className="card-body p-4 d-flex flex-column gap-3">
              <div>
                <Link to="/bienvenida" className="small text-decoration-none d-inline-block mb-2">
                  ← Volver al inicio
                </Link>
                <h1 className="h3 mb-1">Crear cuenta de paciente</h1>
                <p className="text-body-secondary mb-0">
                  {params.get('agendar') ? 'Crea tu cuenta y a continuación elige el día y la hora de tu cita.' : 'Regístrate para solicitar citas y seguir tu progreso en línea.'}
                </p>
              </div>
              <Alerta>{error}</Alerta>
              <div className="row g-3">
                <Campo label="Nombre" error={errores.nombre} col="col-sm-6">
                  {(p) => <input {...p} value={form.nombre} onChange={cambiar('nombre')} autoComplete="given-name" />}
                </Campo>
                <Campo label="Apellido" error={errores.apellido} col="col-sm-6">
                  {(p) => <input {...p} value={form.apellido} onChange={cambiar('apellido')} autoComplete="family-name" />}
                </Campo>
                <Campo label="RUT" error={errores.rut} ayuda="Ej: 12.345.678-5" col="col-sm-6">
                  {(p) => <input {...p} value={form.rut} onChange={(e) => setForm({ ...form, rut: formatearRut(e.target.value) })} />}
                </Campo>
                <Campo label="Fecha de nacimiento" error={errores.fechaNacimiento} col="col-sm-6">
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
                <Campo label="Teléfono" error={errores.telefono} col="col-sm-6">
                  {(p) => <input {...p} type="tel" value={form.telefono} onChange={cambiar('telefono')} placeholder="+56 9 1234 5678" autoComplete="tel" />}
                </Campo>
                <Campo label="Correo electrónico" error={errores.email} col="col-12">
                  {(p) => <input {...p} type="email" value={form.email} onChange={cambiar('email')} autoComplete="email" />}
                </Campo>
                <Campo
                  label="Contraseña"
                  error={errores.password}
                  col="col-sm-6"
                  ayuda={form.password && faltas.length ? `Falta: ${faltas.join(', ')}` : 'Mínimo 8 caracteres, con mayúscula, minúscula y número.'}
                >
                  {(p) => <input {...p} type="password" value={form.password} onChange={cambiar('password')} autoComplete="new-password" />}
                </Campo>
                <Campo label="Confirmar contraseña" error={errores.confirmar} col="col-sm-6">
                  {(p) => <input {...p} type="password" value={form.confirmar} onChange={cambiar('confirmar')} autoComplete="new-password" />}
                </Campo>
              </div>
              <div className="form-check">
                <input
                  id="acepta"
                  type="checkbox"
                  className={`form-check-input ${errores.acepta ? 'is-invalid' : ''}`}
                  checked={acepta}
                  onChange={(e) => setAcepta(e.target.checked)}
                />
                <label htmlFor="acepta" className="form-check-label small">
                  Acepto que NutriVida trate mis datos de salud solo para mi atención nutricional.
                </label>
                {errores.acepta && <div className="invalid-feedback">{errores.acepta}</div>}
              </div>
              <button className="btn btn-success btn-lg w-100" disabled={enviando}>
                {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
              <p className="text-center mb-0">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" state={params.get('agendar') ? { desde: destino } : undefined}>
                  Inicia sesión
                </Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
