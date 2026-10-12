import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '../context/AuthContext'
import RutaProtegida from './RutaProtegida'
import { cargarDatosDemo, iniciarComo } from '../test/ayudantes'

function montar(ruta) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/login" element={<p>PANTALLA LOGIN</p>} />
          <Route path="/bienvenida" element={<p>PÁGINA DE BIENVENIDA</p>} />
          <Route path="/sin-permiso" element={<p>ACCESO RESTRINGIDO</p>} />
          <Route element={<RutaProtegida />}>
            <Route
              path="/"
              element={
                <p>
                  INICIO PRIVADO <Link to="/admin/usuarios">ir a usuarios</Link>
                </p>
              }
            />
            <Route element={<RutaProtegida roles={['admin']} />}>
              <Route path="/admin/usuarios" element={<p>GESTIÓN DE USUARIOS</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('components/RutaProtegida', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
  })

  it('sin token redirige una vista protegida al login', () => {
    montar('/admin/usuarios')
    expect(screen.getByText('PANTALLA LOGIN')).toBeTruthy()
    expect(screen.queryByText('GESTIÓN DE USUARIOS')).toBeNull()
  })

  it('un visitante que entra a la raíz ve la página de bienvenida', () => {
    montar('/')
    expect(screen.getByText('PÁGINA DE BIENVENIDA')).toBeTruthy()
  })

  it('con sesión pero sin el rol requerido muestra acceso restringido', async () => {
    await iniciarComo('paciente')
    montar('/admin/usuarios')
    expect(screen.getByText('ACCESO RESTRINGIDO')).toBeTruthy()
  })

  it('con el rol correcto muestra la vista', async () => {
    await iniciarComo('admin')
    montar('/admin/usuarios')
    expect(screen.getByText('GESTIÓN DE USUARIOS')).toBeTruthy()
  })

  it('revalida el token en cada navegación: si fue revocado, vuelve a pedir login', async () => {
    await iniciarComo('admin')
    montar('/')
    expect(screen.getByText(/INICIO PRIVADO/)).toBeTruthy()

    localStorage.setItem('nv_sesiones', '[]') // simula la sesión cerrada desde otro lugar
    fireEvent.click(screen.getByText('ir a usuarios'))
    expect(await screen.findByText('PANTALLA LOGIN')).toBeTruthy()
  })
})
