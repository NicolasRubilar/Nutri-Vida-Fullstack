import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import RutaProtegida from './components/RutaProtegida'
import Layout from './components/Layout'
import { Cargando } from './components/ui'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Bienvenida from './pages/Bienvenida'
import Inicio from './pages/Inicio'
import { NoEncontrada, SinPermiso } from './pages/Errores'
import { ROLES } from './utils/constantes'

const MisCitas = lazy(() => import('./pages/paciente/MisCitas'))
const MiProgreso = lazy(() => import('./pages/paciente/MiProgreso'))
const MiPlan = lazy(() => import('./pages/paciente/MiPlan'))
const Agenda = lazy(() => import('./pages/staff/Agenda'))
const Pacientes = lazy(() => import('./pages/staff/Pacientes'))
const PacienteDetalle = lazy(() => import('./pages/staff/PacienteDetalle'))
const Usuarios = lazy(() => import('./pages/admin/Usuarios'))
const Reportes = lazy(() => import('./pages/admin/Reportes'))
const Ubicacion = lazy(() => import('./pages/Ubicacion'))
const Perfil = lazy(() => import('./pages/Perfil'))
const Notificaciones = lazy(() => import('./pages/Notificaciones'))

const { ADMIN, SECRETARIA, NUTRICIONISTA, PACIENTE } = ROLES

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Cargando />}>
          <Routes>
            {/* Vistas públicas: bienvenida (solo información institucional), login y registro */}
            <Route path="/bienvenida" element={<Bienvenida />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />

            {/* Todo lo demás exige sesión válida */}
            <Route element={<RutaProtegida />}>
              <Route element={<Layout />}>
                <Route index element={<Inicio />} />
                <Route path="ubicacion" element={<Ubicacion />} />
                <Route path="perfil" element={<Perfil />} />
                <Route path="notificaciones" element={<Notificaciones />} />
                <Route path="sin-permiso" element={<SinPermiso />} />

                <Route element={<RutaProtegida roles={[PACIENTE]} />}>
                  <Route path="mis-citas" element={<MisCitas />} />
                  <Route path="progreso" element={<MiProgreso />} />
                  <Route path="plan" element={<MiPlan />} />
                </Route>

                <Route element={<RutaProtegida roles={[ADMIN, SECRETARIA, NUTRICIONISTA]} />}>
                  <Route path="agenda" element={<Agenda />} />
                  <Route path="pacientes" element={<Pacientes />} />
                </Route>

                <Route element={<RutaProtegida roles={[ADMIN, NUTRICIONISTA]} />}>
                  <Route path="pacientes/:id" element={<PacienteDetalle />} />
                </Route>

                <Route element={<RutaProtegida roles={[ADMIN]} />}>
                  <Route path="admin/usuarios" element={<Usuarios />} />
                  <Route path="admin/reportes" element={<Reportes />} />
                </Route>

                <Route path="*" element={<NoEncontrada />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
