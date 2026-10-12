import { fireEvent, render, screen } from '@testing-library/react'
import LimiteError from './LimiteError'
import Perfil from '../pages/Perfil'
import Notificaciones from '../pages/Notificaciones'
import { cargarDatosDemo, esperarAnimaciones, hastaQue, iniciarComo, montarVista } from '../test/ayudantes'

describe('components/Layout (menú según rol)', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
  })

  it('el paciente ve solo sus opciones de menú', async () => {
    await iniciarComo('paciente')
    montarVista(<p>contenido</p>)

    expect(screen.getByRole('link', { name: /Mis citas/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Usuarios/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Agenda de citas/ })).toBeNull()
    expect(screen.getByText('Pedro Sandoval')).toBeTruthy()
    await esperarAnimaciones(50) // deja terminar la carga de notificaciones de la campana
  })

  it('el administrador ve el panel de administración', async () => {
    await iniciarComo('admin')
    montarVista(<p>contenido</p>)

    expect(screen.getByRole('link', { name: /Usuarios/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Reportes/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Mis citas/ })).toBeNull()
    await esperarAnimaciones(50)
  })

  it('muestra en la campana la cantidad de notificaciones sin leer', async () => {
    await iniciarComo('paciente')
    montarVista(<p>contenido</p>)
    await hastaQue(() => screen.getByLabelText(/Notificaciones \(\d+ sin leer\)/).querySelector('.badge'))
    expect(screen.getByLabelText(/Notificaciones/).getAttribute('aria-label')).toMatch(/\(\d+ sin leer\)/)
  })

  it('cerrar sesión elimina el token y vuelve a la página de bienvenida', async () => {
    await iniciarComo('secretaria')
    montarVista(<p>contenido</p>)

    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión/ }))
    expect(await screen.findByText('PÁGINA DE BIENVENIDA')).toBeTruthy()
    expect(sessionStorage.getItem('nv_token')).toBeNull()
  })
})

describe('pages/Notificaciones y pages/Perfil', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
    await iniciarComo('paciente')
  })

  it('marca todas las notificaciones como leídas', async () => {
    montarVista(<Notificaciones />, { ruta: '/notificaciones' })

    fireEvent.click(await screen.findByRole('button', { name: /Marcar todas como leídas/ }))
    expect(await screen.findByText('Estás al día')).toBeTruthy()
  })

  it('actualiza los datos personales del perfil', async () => {
    montarVista(<Perfil />, { ruta: '/perfil' })

    fireEvent.change(await screen.findByLabelText('Teléfono'), { target: { value: '+56 9 1111 2222' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Datos actualizados.')).toBeTruthy()
  })

  it('valida el cambio de contraseña: confirmación distinta y clave actual incorrecta', async () => {
    montarVista(<Perfil />, { ruta: '/perfil' })
    const llenar = (etiqueta, valor) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })

    await screen.findByLabelText('Contraseña actual')
    llenar('Contraseña actual', 'Paciente123')
    llenar('Nueva contraseña', 'Nueva2026')
    llenar('Confirmar nueva contraseña', 'Otra2026')
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))
    expect(screen.getByText('Las contraseñas nuevas no coinciden.')).toBeTruthy()

    llenar('Contraseña actual', 'Incorrecta1')
    llenar('Confirmar nueva contraseña', 'Nueva2026')
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeTruthy()
  })
})

describe('components/LimiteError', () => {
  function Fallido() {
    throw new Error('falla de prueba')
  }

  it('muestra un mensaje amigable en vez de dejar la pantalla en blanco', () => {
    spyOn(console, 'error') // React registra el error capturado; se silencia en la prueba
    render(
      <LimiteError ruta="/">
        <Fallido />
      </LimiteError>,
    )

    expect(screen.getByText('Algo salió mal')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})
