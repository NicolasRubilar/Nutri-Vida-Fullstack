import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { sesionActual } from '../services/auth'

// Bloquea cualquier vista sin token válido y, si se indican roles, sin el rol adecuado.
export default function RutaProtegida({ roles }) {
  const { usuario, logout } = useAuth()
  const location = useLocation()

  // Revalida el token en cada navegación (puede haber expirado o sido revocado)
  const vigente = usuario ? sesionActual() : null
  if (!usuario || !vigente) {
    if (usuario) queueMicrotask(logout)
    // Un visitante que entra a la raíz ve la página de bienvenida
    if (!usuario && location.pathname === '/') return <Navigate to="/bienvenida" replace />
    return <Navigate to="/login" replace state={{ desde: location.pathname, expirada: !!usuario }} />
  }
  if (roles && !roles.includes(vigente.rol)) {
    return <Navigate to="/sin-permiso" replace />
  }
  return <Outlet />
}
