import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as auth from '../services/auth'

const AuthContext = createContext(null)

export const EVENTO_SESION_EXPIRADA = 'nv:sesion-expirada'

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => auth.sesionActual())

  useEffect(() => {
    const expirar = () => {
      auth.cerrarSesion()
      setUsuario(null)
    }
    window.addEventListener(EVENTO_SESION_EXPIRADA, expirar)
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, expirar)
  }, [])

  const login = useCallback(async (email, password) => {
    const u = await auth.iniciarSesion(email, password)
    setUsuario(u)
    return u
  }, [])

  const registrar = useCallback(async (datos) => {
    const u = await auth.registrarPaciente(datos)
    setUsuario(u)
    return u
  }, [])

  const logout = useCallback(() => {
    auth.cerrarSesion()
    setUsuario(null)
  }, [])

  // Vuelve a leer el usuario (tras editar el perfil) y valida que el token siga vigente
  const refrescar = useCallback(() => {
    const u = auth.sesionActual()
    setUsuario(u)
    return u
  }, [])

  const valor = useMemo(() => ({ usuario, login, registrar, logout, refrescar }), [usuario, login, registrar, logout, refrescar])
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
