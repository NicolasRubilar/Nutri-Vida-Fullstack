import * as api from './api'
import { guardarSesion } from './http'

const USUARIO = { id: 'u1', nombre: 'Camila', apellido: 'Rojas', rol: 'nutricionista' }

// Contrato frontend ↔ backend: cada función llama al endpoint REST correcto con el cuerpo correcto
describe('services/api: endpoints de la API REST', () => {
  let llamadas

  beforeEach(() => {
    guardarSesion({ accessToken: 'jwt', expiraEn: Date.now() + 600_000, usuario: USUARIO })
    llamadas = []
    window.fetch.and.callFake((url, op) => {
      const u = new URL(String(url))
      llamadas.push({ metodo: op.method, ruta: u.pathname, query: Object.fromEntries(u.searchParams), cuerpo: op.body && JSON.parse(op.body) })
      const cuerpo = u.pathname === '/api/ausencias' ? { afectadas: 3 } : u.pathname === '/api/perfil' ? { ...USUARIO, nombre: 'Camila Andrea' } : {}
      return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: 200 }))
    })
  })

  const ultima = () => llamadas.at(-1)

  it('CRUD de usuarios (admin)', async () => {
    await api.listarUsuarios()
    expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'GET', ruta: '/api/usuarios' }))
    await api.crearUsuario({ nombre: 'Rosa' })
    expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'POST', ruta: '/api/usuarios', cuerpo: { nombre: 'Rosa' } }))
    await api.actualizarUsuario('u9', { nombre: 'Rosa' })
    expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'PUT', ruta: '/api/usuarios/u9' }))
    await api.cambiarEstadoUsuario('u9', false)
    expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'PATCH', ruta: '/api/usuarios/u9/estado', cuerpo: { activo: false } }))
    await api.eliminarUsuario('u9')
    expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'DELETE', ruta: '/api/usuarios/u9' }))
  })

  it('las mediciones se envían con números (los inputs entregan texto) y vacíos como null', async () => {
    await api.registrarMedicion('p1', { fecha: '2026-11-02', peso: '82.5', talla: '170', cintura: '', grasa: undefined, notas: 'ok' })

    expect(ultima()).toEqual({
      metodo: 'POST',
      ruta: '/api/pacientes/p1/mediciones',
      query: {},
      cuerpo: { fecha: '2026-11-02', peso: 82.5, talla: 170, cintura: null, grasa: null, notas: 'ok' },
    })
    await api.actualizarMedicion('m1', { fecha: '2026-11-02', peso: 80, talla: 170 })
    expect(ultima().metodo + ' ' + ultima().ruta).toBe('PUT /api/mediciones/m1')
    await api.eliminarMedicion('m1')
    expect(ultima().metodo + ' ' + ultima().ruta).toBe('DELETE /api/mediciones/m1')
  })

  it('guardarPlan crea (POST anidado en el paciente) o edita (PUT por id)', async () => {
    await api.guardarPlan('p1', { objetivo: 'X', calorias: '1900', almuerzo: 'Y' })
    expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'POST', ruta: '/api/pacientes/p1/planes' }))
    expect(ultima().cuerpo.calorias).toBe(1900)

    await api.guardarPlan('p1', { objetivo: 'X', calorias: '', almuerzo: 'Y' }, 'plan7')
    expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'PUT', ruta: '/api/planes/plan7' }))
    expect(ultima().cuerpo.calorias).toBeNull()
  })

  it('el listado de citas envía solo los filtros indicados como parámetros de consulta', async () => {
    await api.listarCitas({ desde: '2026-11-01', hasta: '2026-11-30', estado: undefined })
    expect(ultima()).toEqual(jasmine.objectContaining({ ruta: '/api/citas', query: { desde: '2026-11-01', hasta: '2026-11-30' } }))

    await api.horariosDisponibles('n1', '2026-11-10', 'c4')
    expect(ultima().query).toEqual({ nutricionistaId: 'n1', fecha: '2026-11-10', excluir: 'c4' })
  })

  it('las acciones sobre una cita usan PATCH /api/citas/{id}/{acción}', async () => {
    await api.confirmarCita('c1', { fecha: '2026-11-10', hora: '10:00' })
    await api.cancelarCita('c1', 'Viaje')
    await api.reprogramarCita('c1', { fecha: '2026-11-11', hora: '11:00' })
    await api.marcarAsistencia('c1', true)

    expect(llamadas.map((l) => `${l.metodo} ${l.ruta}`)).toEqual([
      'PATCH /api/citas/c1/confirmar',
      'PATCH /api/citas/c1/cancelar',
      'PATCH /api/citas/c1/reprogramar',
      'PATCH /api/citas/c1/asistencia',
    ])
    expect(llamadas[1].cuerpo).toEqual({ motivo: 'Viaje' })
    expect(llamadas[3].cuerpo).toEqual({ asistio: true })
  })

  it('registrarAusencia devuelve la cantidad de citas afectadas', async () => {
    expect(await api.registrarAusencia('n1', '2026-11-10')).toBe(3)
    expect(ultima().cuerpo).toEqual({ nutricionistaId: 'n1', fecha: '2026-11-10' })
  })

  it('el equipo público se pide sin token', async () => {
    await api.equipoPublico()
    expect(window.fetch.calls.mostRecent().args[1].headers.Authorization).toBeUndefined()
  })
})
