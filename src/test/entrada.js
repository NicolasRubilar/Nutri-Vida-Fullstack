// Punto de entrada de Karma: reúne todas las pruebas *.spec.js(x) del proyecto en un solo paquete.
import { act } from 'react'
import { cleanup } from '@testing-library/react'

// El hash de contraseñas (PBKDF2) es deliberadamente lento: se da más margen a las pruebas
jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000

// Cada prueba parte con almacenamiento limpio y sin componentes montados
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
// Antes de desmontar, procesa dentro de act() las actualizaciones asíncronas pendientes
// (cargas de datos, ResizeObserver de los gráficos) para que React no las reporte.
afterEach(async () => {
  await act(() => new Promise((r) => setTimeout(r, 20)))
  cleanup()
})

// Busca todos los archivos *.spec.js / *.spec.jsx dentro de src/
const contexto = import.meta.webpackContext('..', { recursive: true, regExp: /\.spec\.jsx?$/ })
contexto.keys().forEach(contexto)
