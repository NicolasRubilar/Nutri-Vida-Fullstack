import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as auth from '../services/auth'
import { MARCA_SESION } from '../services/http'

const AuthContext = createContext(null)

export const EVENTO_SESION_EXPIRADA = 'nv:sesion-expirada'

// Estado global de autenticación. Mantiene la sesión al recargar la página: si hay una sesión
// previa, la restaura con la cookie de renovación antes de mostrar las vistas protegidas.
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => auth.sesionActual())
  const [restaurando, setRestaurando] = useState(() => !auth.sesionActual() && auth.haySesionRestaurable())
  const [expirada, setExpirada] = useState(false)

  useEffect(() => {
    if (!restaurando) return
    auth
      .restaurarSesion()
      .then((u) => setUsuario(u))
      .finally(() => setRestaurando(false))
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Un 401 que no se pudo renovar (token revocado, cuenta desactivada, sesión vencida)
    const expirar = () => {
      auth.cerrarSesion()
      setUsuario(null)
      setExpirada(true)
    }
    // Cerrar sesión en otra pestaña cierra esta también; iniciarla en otra la recupera aquí
    const sincronizar = (e) => {
      if (e.key !== MARCA_SESION) return
      if (!e.newValue) {
        auth.cerrarSesion()
        setUsuario(null)
      } else if (!auth.sesionActual()) {
        auth.restaurarSesion().then((u) => u && setUsuario(u))
      }
    }
    window.addEventListener(EVENTO_SESION_EXPIRADA, expirar)
    window.addEventListener('storage', sincronizar)
    return () => {
      window.removeEventListener(EVENTO_SESION_EXPIRADA, expirar)
      window.removeEventListener('storage', sincronizar)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const u = await auth.iniciarSesion(email, password)
    setExpirada(false)
    setUsuario(u)
    return u
  }, [])

  const registrar = useCallback(async (datos) => {
    const u = await auth.registrarPaciente(datos)
    setExpirada(false)
    setUsuario(u)
    return u
  }, [])

  const logout = useCallback(() => {
    auth.cerrarSesion()
    setExpirada(false)
    setUsuario(null)
  }, [])

  // Vuelve a leer el usuario de la sesión (tras editar el perfil)
  const refrescar = useCallback(() => {
    const u = auth.sesionActual()
    setUsuario(u)
    return u
  }, [])

  const valor = useMemo(
    () => ({ usuario, restaurando, expirada, login, registrar, logout, refrescar }),
    [usuario, restaurando, expirada, login, registrar, logout, refrescar],
  )
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
