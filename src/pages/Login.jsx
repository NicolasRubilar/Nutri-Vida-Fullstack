import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext'
import PanelMarca from '../components/PanelMarca'
import FormLogin from '../components/FormLogin'
import { destinoTrasLogin } from '../utils/constantes'

// Pantalla de acceso usada cuando una sesión expira o se intenta abrir una vista protegida.
// El acceso habitual está en la sección "Accede a tu cuenta" de la página de bienvenida.
export default function Login() {
  const { usuario } = useAuth()
  const location = useLocation()

  if (usuario) return <Navigate to={destinoTrasLogin(location.state?.desde, usuario.rol)} replace />

  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <PanelMarca />
        <section className="col-md-7 col-xl-8 d-flex flex-column align-items-center justify-content-md-center py-4 px-3">
          <FormLogin
            avisoInicial={location.state?.expirada ? 'Tu sesión expiró. Vuelve a iniciar sesión.' : ''}
            encabezado={
              <div>
                <Link to="/bienvenida" className="small text-decoration-none d-inline-block mb-2">
                  ← Volver al inicio
                </Link>
                <h1 className="h3 mb-1">Iniciar sesión</h1>
                <p className="text-body-secondary mb-0">
                  {location.state?.desde ? 'Inicia sesión para continuar.' : 'Accede para gestionar tus citas, tu progreso y tu plan alimenticio.'}
                </p>
              </div>
            }
          />
        </section>
      </div>
    </div>
  )
}
