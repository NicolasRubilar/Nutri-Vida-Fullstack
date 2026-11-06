import { ApiError, MARCA_SESION, guardarSesion, http, limpiarSesion, peticionPublica, usuarioEnSesion } from './http'

const USUARIO = { id: 'u1', nombre: 'Andrea', apellido: 'Fuentes', rol: 'admin' }

function json(status, cuerpo) {
  return Promise.resolve(new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } }))
}

// Reemplaza el backend simulado por respuestas programadas para cada prueba
function responder(fn) {
  window.fetch.and.callFake((url, opciones) => fn(new URL(String(url)).pathname, opciones))
}

describe('services/http: cliente de la API REST', () => {
  it('envía el JWT en la cabecera Authorization y la cookie de renovación (credentials: include)', async () => {
    guardarSesion({ accessToken: 'jwt-1', expiraEn: Date.now() + 600_000, usuario: USUARIO })
    responder(() => json(200, [{ id: 'c1' }]))

    const datos = await http.get('/citas', { estado: 'pendiente', desde: undefined })

    const [url, opciones] = window.fetch.calls.mostRecent().args
    expect(String(url)).toContain('/api/citas?estado=pendiente')
    expect(String(url)).not.toContain('desde')
    expect(opciones.headers.Authorization).toBe('Bearer jwt-1')
    expect(opciones.credentials).toBe('include')
    expect(datos).toEqual([{ id: 'c1' }])
  })

  it('el token vive solo en memoria: en el almacenamiento queda una marca sin datos sensibles', () => {
    guardarSesion({ accessToken: 'jwt-secreto', expiraEn: Date.now() + 600_000, usuario: USUARIO })

    expect(localStorage.getItem(MARCA_SESION)).toBe('1')
    const todo = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })
    expect(todo).not.toContain('jwt-secreto')
    expect(usuarioEnSesion()).toEqual(USUARIO)
  })

  it('ante un 401 renueva el JWT con /auth/refresh y repite la petición', async () => {
    guardarSesion({ accessToken: 'vencido', expiraEn: Date.now() + 600_000, usuario: USUARIO })
    responder((ruta, op) => {
      if (ruta === '/api/auth/refresh') return json(200, { accessToken: 'nuevo', expiraEn: Date.now() + 900_000, usuario: USUARIO })
      return op.headers.Authorization === 'Bearer nuevo' ? json(200, { ok: true }) : json(401, { mensaje: 'Token vencido' })
    })

    expect(await http.get('/auth/yo')).toEqual({ ok: true })
    const rutas = window.fetch.calls.allArgs().map(([u]) => new URL(String(u)).pathname)
    expect(rutas).toEqual(['/api/auth/yo', '/api/auth/refresh', '/api/auth/yo'])
  })

  it('renueva antes de enviar si el JWT está por vencer, y varias peticiones comparten una sola renovación', async () => {
    guardarSesion({ accessToken: 'casi-vencido', expiraEn: Date.now() + 5_000, usuario: USUARIO })
    responder((ruta) => (ruta === '/api/auth/refresh' ? json(200, { accessToken: 'nuevo', expiraEn: Date.now() + 900_000, usuario: USUARIO }) : json(200, [])))

    await Promise.all([http.get('/citas'), http.get('/notificaciones'), http.get('/pacientes')])

    const renovaciones = window.fetch.calls.allArgs().filter(([u]) => String(u).endsWith('/auth/refresh'))
    expect(renovaciones.length).toBe(1)
    window.fetch.calls.allArgs().filter(([u]) => !String(u).endsWith('/auth/refresh'))
      .forEach(([, op]) => expect(op.headers.Authorization).toBe('Bearer nuevo'))
  })

  it('si la renovación falla, limpia la sesión y responde 401', async () => {
    guardarSesion({ accessToken: 'revocado', expiraEn: Date.now() + 600_000, usuario: USUARIO })
    responder(() => json(401, { mensaje: 'Tu sesión expiró. Inicia sesión nuevamente.' }))

    const error = await http.get('/citas').catch((e) => e)

    expect(error).toEqual(jasmine.any(ApiError))
    expect(error.status).toBe(401)
    expect(usuarioEnSesion()).toBeNull()
    expect(localStorage.getItem(MARCA_SESION)).toBeNull()
  })

  it('sin sesión ni marca no llama al servidor y responde 401', async () => {
    limpiarSesion()
    const error = await http.get('/citas').catch((e) => e)
    expect(error.status).toBe(401)
    expect(window.fetch).not.toHaveBeenCalled()
  })

  it('traduce el JSON de error del backend a ApiError con mensaje y campos', async () => {
    responder(() => json(422, { status: 422, mensaje: 'Revisa los campos marcados.', campos: { rut: 'RUT inválido.' } }))

    const error = await peticionPublica('POST', '/auth/registro', { cuerpo: {} }).catch((e) => e)

    expect(error.status).toBe(422)
    expect(error.message).toBe('Revisa los campos marcados.')
    expect(error.campos).toEqual({ rut: 'RUT inválido.' })
  })

  it('si el backend no responde entrega un error de conexión comprensible', async () => {
    window.fetch.and.returnValue(Promise.reject(new TypeError('Failed to fetch')))
    const error = await peticionPublica('GET', '/publico/equipo').catch((e) => e)
    expect(error.status).toBe(0)
    expect(error.message).toContain('No se pudo conectar con el servidor')
  })

  it('una respuesta 204 (sin cuerpo) se entrega como null', async () => {
    guardarSesion({ accessToken: 'jwt', expiraEn: Date.now() + 600_000, usuario: USUARIO })
    responder(() => json(204))
    expect(await http.delete('/mediciones/m1')).toBeNull()
  })
})
