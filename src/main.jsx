import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/index.css'
import App from './App.jsx'
import { inicializarDatos } from './data/seed'
import { generarRecordatorios } from './services/api'

const root = createRoot(document.getElementById('root'))
root.render(
  <div className="d-flex align-items-center justify-content-center gap-2 min-vh-100 text-body-secondary" role="status">
    <span className="spinner-border spinner-border-sm text-success" aria-hidden="true" />
    Preparando NutriVida…
  </div>,
)

// Carga los datos de demostración la primera vez y revisa recordatorios pendientes
inicializarDatos()
  .then(() => generarRecordatorios())
  .finally(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
