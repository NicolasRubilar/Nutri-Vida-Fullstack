import { cerrarSesion, iniciarSesion, registrarPaciente, requerir, sesionActual } from './auth'
import { cargarDatosDemo, CUENTAS, iniciarComo, tabla } from '../test/ayudantes'

const NUEVO = {
  nombre: 'Lucía',
  apellido: 'Millán',
  rut: '11.111.111-1',
  fechaNacimiento: '1996-03-14',
  email: 'lucia@correo.cl',
  telefono: '+56 9 8765 4321',
  password: 'Lucia2026',
}

describe('services/auth: autenticación y sesiones', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
  })

  it('registrarPaciente guarda la contraseña con hash + sal (nunca en texto plano) y crea el perfil', async () => {
    const usuario = await registrarPaciente(NUEVO)

    const guardado = tabla('usuarios').find((u) => u.email === 'lucia@correo.cl')
    expect(usuario.rol).toBe('paciente')
    expect(usuario.passwordHash).toBeUndefined() // no se expone al frontend
    expect(guardado.passwordHash).toMatch(/^[0-9a-f]{64}$/)
    expect(guardado.sal).toMatch(/^[0-9a-f]{32}$/)
    expect(JSON.stringify(guardado)).not.toContain('Lucia2026')
    expect(tabla('pacientes').some((p) => p.usuarioId === guardado.id)).toBeTrue()
    expect(sessionStorage.getItem('nv_token')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('registrarPaciente rechaza datos inválidos con error 422 y detalle por campo', async () => {
    const error = await registrarPaciente({ ...NUEVO, rut: '12.345.678-9', password: 'abc', email: CUENTAS.paciente[0] }).catch((e) => e)

    expect(error.status).toBe(422)
    expect(Object.keys(error.campos)).toEqual(jasmine.arrayContaining(['rut', 'password', 'email']))
    expect(error.campos.email).toContain('Ya existe')
  })

  it('iniciarSesion con credenciales correctas entrega el usuario y un token vigente', async () => {
    const usuario = await iniciarComo('nutri')

    expect(usuario.email).toBe('crojas@nutrivida.cl')
    expect(usuario.sal).toBeUndefined()
    expect(sesionActual().id).toBe(usuario.id)
    expect(tabla('sesiones').length).toBe(1)
  })

  it('una contraseña incorrecta responde 401 con mensaje genérico e intentos restantes', async () => {
    const error = await iniciarSesion(CUENTAS.paciente[0], 'Incorrecta1').catch((e) => e)

    expect(error.status).toBe(401)
    expect(error.message).toContain('Correo o contraseña incorrectos')
    expect(error.message).toContain('Te quedan 4 intentos')
    expect(sesionActual()).toBeNull()
  })

  it('bloquea la cuenta tras 5 intentos fallidos, incluso si luego la clave es correcta', async () => {
    for (let i = 0; i < 5; i++) await iniciarSesion(CUENTAS.paciente[0], 'Incorrecta1').catch(() => {})

    const error = await iniciarComo('paciente').catch((e) => e)
    expect(error.status).toBe(423)
    expect(error.message).toContain('bloqueada')
  })

  it('no permite iniciar sesión a una cuenta desactivada', async () => {
    const usuarios = tabla('usuarios').map((u) => (u.email === CUENTAS.secretaria[0] ? { ...u, activo: false } : u))
    localStorage.setItem('nv_usuarios', JSON.stringify(usuarios))

    const error = await iniciarComo('secretaria').catch((e) => e)
    expect(error.status).toBe(403)
  })

  it('requerir() rechaza sin token (401) y con rol no permitido (403)', async () => {
    expect(() => requerir()).toThrowMatching((e) => e.status === 401)

    await iniciarComo('paciente')
    expect(() => requerir('admin')).toThrowMatching((e) => e.status === 403)
    expect(requerir('paciente').rol).toBe('paciente')
  })

  it('la sesión expira después de 120 minutos sin actividad (mock del reloj)', async () => {
    await iniciarComo('admin')
    jasmine.clock().install()
    jasmine.clock().mockDate(new Date(Date.now() + 121 * 60_000))

    expect(sesionActual()).toBeNull()
    expect(sessionStorage.getItem('nv_token')).toBeNull()
    jasmine.clock().uninstall()
  })

  it('cerrarSesion elimina el token del navegador y la sesión almacenada', async () => {
    await iniciarComo('admin')
    cerrarSesion()

    expect(sessionStorage.getItem('nv_token')).toBeNull()
    expect(tabla('sesiones').length).toBe(0)
  })
})
