import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { Cargando } from './ui'

// Bloquea cualquier vista sin sesión y, si se indican roles, sin el rol adecuado.
// Es una barrera de interfaz: la autorización real la vuelve a aplicar el backend en cada endpoint,
// así que aunque alguien manipule el frontend, la API responde 401/403.
export default function RutaProtegida({ roles }) {
  const { usuario, restaurando, expirada } = useAuth()
  const location = useLocation()

  // Tras recargar la página se espera a recuperar la sesión antes de decidir
  if (restaurando) return <Cargando texto="Recuperando tu sesión…" />
  if (!usuario) {
    // Un visitante que entra a la raíz ve la página de bienvenida
    if (!expirada && location.pathname === '/') return <Navigate to="/bienvenida" replace />
    return <Navigate to="/login" replace state={{ desde: location.pathname, expirada }} />
  }
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/sin-permiso" replace />
  }
  return <Outlet />
}
