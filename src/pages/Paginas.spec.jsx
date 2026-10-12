import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '../context/AuthContext'
import Ubicacion from './Ubicacion'
import Registro from './Registro'
import Bienvenida from './Bienvenida'
import Login from './Login'
import { NoEncontrada, SinPermiso } from './Errores'
import { cargarDatosDemo, iniciarComo } from '../test/ayudantes'

function conRouter(elemento, ruta = '/') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>{elemento}</MemoryRouter>
    </AuthProvider>,
  )
}

describe('pages/Ubicacion (mapa)', () => {
  it('con la ubicación del usuario (mock de geolocalización) calcula la distancia y arma la ruta', () => {
    spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake((ok) => ok({ coords: { latitude: -38.7395, longitude: -72.5905 } }))
    conRouter(<Ubicacion />)

    fireEvent.click(screen.getByRole('button', { name: /Usar mi ubicación/ }))

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled()
    expect(screen.getByText(/km$/).textContent).toMatch(/^\d+,?\.?\d* km$/)
    const enlace = screen.getByRole('link', { name: 'Indicaciones en Google Maps' })
    expect(enlace.getAttribute('href')).toContain('origin=-38.7395,-72.5905')
    expect(enlace.getAttribute('href')).toContain('destination=-38.7369,-72.6139')
  })

  it('si el usuario niega el permiso muestra un mensaje claro', () => {
    spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake((_ok, error) => error({ code: 1 }))
    conRouter(<Ubicacion />)

    fireEvent.click(screen.getByRole('button', { name: /Usar mi ubicación/ }))
    expect(screen.getByRole('alert').textContent).toContain('Debes permitir el acceso a tu ubicación')
  })
})

describe('pages/Registro', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
  })

  const llenar = (etiqueta, valor) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })

  it('valida en el formulario que las contraseñas coincidan y que se acepten los términos', () => {
    conRouter(<Registro />, '/registro')
    llenar('Contraseña', 'Lucia2026')
    llenar('Confirmar contraseña', 'Otra2026')
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()
    expect(screen.getByText('Debes aceptar el tratamiento de tus datos.')).toBeTruthy()
  })

  it('al registrarse desde "Agenda tu hora" lleva directo a solicitar la cita', async () => {
    conRouter(
      <Routes>
        <Route path="/registro" element={<Registro />} />
        <Route path="/mis-citas" element={<p>SOLICITUD DE CITA</p>} />
      </Routes>,
      '/registro?agendar=1',
    )
    llenar('Nombre', 'Lucía')
    llenar('Apellido', 'Millán')
    llenar('RUT', '111111111')
    llenar('Fecha de nacimiento', '1996-03-14')
    llenar('Correo electrónico', 'lucia@correo.cl')
    llenar('Contraseña', 'Lucia2026')
    llenar('Confirmar contraseña', 'Lucia2026')
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByLabelText('RUT').value).toBe('11.111.111-1') // formateo automático
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('SOLICITUD DE CITA')).toBeTruthy()
  })
})

describe('pages/Bienvenida (pública)', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
  })

  it('muestra el equipo y la sección de acceso a un visitante sin sesión', async () => {
    conRouter(<Bienvenida />, '/bienvenida')

    expect(await screen.findByText('Agendar con Javiera')).toBeTruthy()
    expect(screen.getByText('Accede a tu cuenta')).toBeTruthy()
    expect(screen.getByText('Agendar con Javiera').getAttribute('href')).toMatch(/^\/registro\?agendar=1&nutri=/)
  })

  it('con sesión iniciada reemplaza el login por el acceso al panel', async () => {
    await iniciarComo('paciente')
    conRouter(<Bienvenida />, '/bienvenida')

    expect(screen.queryByText('Accede a tu cuenta')).toBeNull()
    expect(screen.getByText('Hola, Pedro')).toBeTruthy()
    expect((await screen.findByText('Agendar con Camila')).getAttribute('href')).toMatch(/^\/mis-citas\?nueva=1/)
  })
})

describe('pages/Login y pages/Errores', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
  })

  it('/login avisa cuando la sesión expiró y vuelve a la vista que se intentaba abrir', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: { desde: '/admin/reportes', expirada: true } }]}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/reportes" element={<p>REPORTES</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )
    expect(screen.getByText('Tu sesión expiró. Vuelve a iniciar sesión.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'admin@nutrivida.cl' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Admin123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('REPORTES')).toBeTruthy()
  })

  it('las páginas de error ofrecen volver al inicio', () => {
    conRouter(
      <>
        <SinPermiso />
        <NoEncontrada />
      </>,
    )
    expect(screen.getByText('Acceso restringido')).toBeTruthy()
    expect(screen.getByText('Página no encontrada')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Volver al inicio' }).length).toBe(2)
  })
})
