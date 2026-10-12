import { useCallback, useEffect, useState } from 'react'
import { EVENTO_SESION_EXPIRADA } from '../context/AuthContext'

// Ejecuta una función de servicio y expone { data, cargando, error, recargar }.
export function useApi(fn, deps = []) {
  const [estado, setEstado] = useState({ data: null, cargando: true, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let activo = true
    fn()
      .then((data) => activo && setEstado({ data, cargando: false, error: null }))
      .catch((error) => {
        if (!activo) return
        if (error.status === 401) window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA))
        setEstado({ data: null, cargando: false, error })
      })
    return () => {
      activo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { ...estado, recargar }
}

// Para acciones (guardar, cancelar, etc.): maneja estado de envío y errores por campo.
export function useAccion() {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const ejecutar = useCallback(async (fn) => {
    setEnviando(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      if (e.status === 401) window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA))
      setError(e)
      throw e
    } finally {
      setEnviando(false)
    }
  }, [])

  const limpiar = useCallback(() => setError(null), [])
  return { ejecutar, enviando, error, campos: error?.campos ?? {}, limpiar }
}
