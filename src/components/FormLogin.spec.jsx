import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '../context/AuthContext'
import FormLogin from './FormLogin'
import { cargarDatosDemo, esperarAnimaciones } from '../test/ayudantes'

function montar() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/bienvenida']}>
        <Routes>
          <Route path="/bienvenida" element={<FormLogin encabezado={<h2>Accede a tu cuenta</h2>} />} />
          <Route path="/" element={<p>PANEL PRINCIPAL</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

const escribir = (etiqueta, valor) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })

describe('components/FormLogin', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
  })

  it('valida que se ingresen correo y contraseña antes de enviar', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(screen.getByRole('alert').textContent).toContain('Ingresa tu correo y contraseña')
  })

  it('muestra el error del servicio cuando las credenciales son incorrectas', async () => {
    montar()
    escribir('Correo electrónico', 'paciente@nutrivida.cl')
    escribir('Contraseña', 'Equivocada1')
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Correo o contraseña incorrectos')
    expect(screen.queryByText('PANEL PRINCIPAL')).toBeNull()
  })

  it('con credenciales válidas inicia sesión y navega al panel', async () => {
    montar()
    escribir('Correo electrónico', 'admin@nutrivida.cl')
    escribir('Contraseña', 'Admin123')
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('PANEL PRINCIPAL')).toBeTruthy()
    expect(sessionStorage.getItem('nv_token')).not.toBeNull()
  })

  it('las cuentas de demostración rellenan el formulario (estado controlado)', () => {
    montar()
    fireEvent.click(screen.getByText('Secretaria').closest('button'))

    expect(screen.getByLabelText('Correo electrónico').value).toBe('secretaria@nutrivida.cl')
    expect(screen.getByLabelText('Contraseña').value).toBe('Secre123')
  })

  it('no restablece los datos si el usuario cancela la confirmación (mock de window.confirm)', async () => {
    spyOn(window, 'confirm').and.returnValue(false)
    localStorage.setItem('nv_marca', 'sin cambios')
    montar()

    fireEvent.click(screen.getByText('Restablecer datos de demostración'))
    expect(window.confirm).toHaveBeenCalled()
    await esperarAnimaciones(300) // da tiempo a que un restablecimiento (si ocurriera) termine
    expect(localStorage.getItem('nv_marca')).toBe('sin cambios')
    expect(screen.queryByText('Datos de demostración restablecidos.')).toBeNull()
  })
})
