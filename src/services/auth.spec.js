import { cambiarPassword, cerrarSesion, iniciarSesion, registrarPaciente, restaurarSesion, sesionActual } from './auth'
import { MARCA_SESION, limpiarSesion } from './http'
import { cargarDatosDemo, CUENTAS, iniciarComo, tabla } from '../test/ayudantes'

const ruta = (llamada) => new URL(String(llamada[0])).pathname

// Simula recargar la página: la memoria de JavaScript se pierde, la cookie y la marca no
function recargarPagina() {
  limpiarSesion()
  localStorage.setItem(MARCA_SESION, '1')
}

describe('services/auth: sesión en el frontend', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
  })

  it('iniciarSesion hace POST /api/auth/login y deja el usuario en memoria', async () => {
    const usuario = await iniciarComo('nutri')

    const [url, opciones] = window.fetch.calls.mostRecent().args
    expect(new URL(String(url)).pathname).toBe('/api/auth/login')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body)).toEqual({ email: CUENTAS.nutri[0], password: CUENTAS.nutri[1] })
    expect(usuario.email).toBe('crojas@nutrivida.cl')
    expect(sesionActual().id).toBe(usuario.id)
    expect(localStorage.getItem(MARCA_SESION)).toBe('1')
  })

  it('credenciales incorrectas: muestra el mensaje del backend y no deja sesión', async () => {
    const error = await iniciarSesion(CUENTAS.paciente[0], 'Incorrecta1').catch((e) => e)

    expect(error.status).toBe(401)
    expect(error.message).toContain('Te quedan 4 intentos')
    expect(sesionActual()).toBeNull()
    expect(localStorage.getItem(MARCA_SESION)).toBeNull()
  })

  it('la sesión sobrevive a una recarga: se restaura con la cookie de renovación', async () => {
    const usuario = await iniciarComo('paciente')
    recargarPagina()
    expect(sesionActual()).toBeNull()

    const restaurado = await restaurarSesion()

    expect(restaurado.id).toBe(usuario.id)
    expect(sesionActual().id).toBe(usuario.id)
    expect(window.fetch.calls.allArgs().map(ruta)).toContain('/api/auth/refresh')
  })

  it('sin sesión previa no intenta restaurar (un visitante no llama al backend)', async () => {
    expect(await restaurarSesion()).toBeNull()
    expect(window.fetch).not.toHaveBeenCalled()
  })

  it('cerrarSesion olvida el token y pide al backend revocar la cookie', async () => {
    await iniciarComo('admin')
    await cerrarSesion()

    expect(sesionActual()).toBeNull()
    expect(localStorage.getItem(MARCA_SESION)).toBeNull()
    expect(window.fetch.calls.mostRecent().args[0].toString()).toContain('/api/auth/logout')
    recargarPagina()
    expect(await restaurarSesion()).toBeNull()
  })

  it('registrarPaciente envía el formulario y deja la sesión iniciada como paciente', async () => {
    const u = await registrarPaciente({
      nombre: 'Lucía',
      apellido: 'Millán',
      rut: '11.111.111-1',
      fechaNacimiento: '1996-03-14',
      email: 'lucia@correo.cl',
      password: 'Lucia2026',
    })

    expect(u.rol).toBe('paciente')
    expect(sesionActual().email).toBe('lucia@correo.cl')
  })

  it('cambiarPassword reemplaza el token de esta pestaña y cierra las demás sesiones', async () => {
    await iniciarComo('paciente')
    await iniciarComo('paciente') // segunda sesión (otro dispositivo)
    expect(tabla('sesiones').length).toBe(2)

    await cambiarPassword('Paciente123', 'NuevaClave9')

    expect(tabla('sesiones').length).toBe(1)
    expect(sesionActual().email).toBe(CUENTAS.paciente[0])
  })
})
