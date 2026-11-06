// Backend simulado para las pruebas de componentes (Jasmine/Karma).
//
// Las pruebas de la interfaz no levantan Spring Boot: se reemplaza window.fetch por un "servidor"
// que atiende las mismas rutas y responde con el mismo formato JSON que la API real. Detrás usa la
// implementación en localStorage de la entrega anterior (db.js, auth.js, api.js de esta carpeta).
// Así las vistas se prueban de punta a punta: componente → services/api.js → http.js → fetch.
// Las reglas de negocio reales se prueban en el backend (pruebas de integración con JUnit + MockMvc).
import * as api from './api'
import * as auth from './auth'
import { db } from './db'

const TOKEN_KEY = 'nv_token'

// Cookie HttpOnly simulada: el token de la sesión local hace las veces de refresh token
let cookieRefresco = null

function respuesta(status, cuerpo) {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function sesion(usuario) {
  const token = sessionStorage.getItem(TOKEN_KEY)
  cookieRefresco = token
  return { accessToken: token, tipo: 'Bearer', expiraEn: Date.now() + 15 * 60_000, usuario }
}

const actual = () => auth.requerir()
const id = (m) => decodeURIComponent(m[1])

// [método, patrón de ruta, manejador(match, cuerpo, query)]
const RUTAS = [
  ['POST', /^\/api\/auth\/login$/, async (m, b) => sesion(await auth.iniciarSesion(b.email, b.password))],
  ['POST', /^\/api\/auth\/registro$/, async (m, b) => [201, sesion(await auth.registrarPaciente(b))]],
  ['POST', /^\/api\/auth\/refresh$/, () => {
    sessionStorage.setItem(TOKEN_KEY, cookieRefresco ?? '')
    const u = auth.sesionActual()
    if (!u) throw new auth.ApiError(401, 'Tu sesión expiró. Inicia sesión nuevamente.')
    return sesion(u)
  }],
  ['POST', /^\/api\/auth\/logout$/, () => {
    sessionStorage.setItem(TOKEN_KEY, cookieRefresco ?? '')
    auth.cerrarSesion()
    cookieRefresco = null
    return [204]
  }],
  ['GET', /^\/api\/auth\/yo$/, actual],
  ['PUT', /^\/api\/auth\/password$/, async (m, b) => {
    await auth.cambiarPassword(b.actual, b.nueva)
    return sesion(actual())
  }],

  ['GET', /^\/api\/usuarios$/, () => api.listarUsuarios()],
  ['POST', /^\/api\/usuarios$/, async (m, b) => [201, await api.crearUsuario(b)]],
  ['PUT', /^\/api\/usuarios\/([^/]+)$/, (m, b) => api.actualizarUsuario(id(m), b)],
  ['PATCH', /^\/api\/usuarios\/([^/]+)\/estado$/, (m, b) => api.cambiarEstadoUsuario(id(m), b.activo)],

  ['PUT', /^\/api\/perfil$/, (m, b) => api.actualizarMiPerfil(b)],
  ['GET', /^\/api\/perfil\/paciente$/, () => api.miPerfilPaciente()],
  ['GET', /^\/api\/nutricionistas$/, () => api.listarNutricionistas()],
  ['GET', /^\/api\/publico\/equipo$/, () => api.equipoPublico()],

  ['GET', /^\/api\/pacientes$/, () => api.listarPacientes()],
  ['GET', /^\/api\/pacientes\/([^/]+)$/, (m) => api.obtenerPaciente(id(m))],
  ['PUT', /^\/api\/pacientes\/([^/]+)\/nutricionista$/, (m, b) => api.asignarNutricionista(id(m), b.nutricionistaId)],
  ['GET', /^\/api\/pacientes\/([^/]+)\/ficha$/, (m) => api.obtenerFicha(id(m))],
  ['PUT', /^\/api\/pacientes\/([^/]+)\/ficha$/, (m, b) => api.guardarFicha(id(m), b)],
  ['GET', /^\/api\/pacientes\/([^/]+)\/mediciones$/, (m) => api.listarMediciones(id(m))],
  ['POST', /^\/api\/pacientes\/([^/]+)\/mediciones$/, async (m, b) => [201, await api.registrarMedicion(id(m), b)]],
  ['GET', /^\/api\/pacientes\/([^/]+)\/planes$/, (m) => api.listarPlanes(id(m))],
  ['POST', /^\/api\/pacientes\/([^/]+)\/planes$/, async (m, b) => [201, await api.guardarPlan(id(m), b)]],
  ['PUT', /^\/api\/mediciones\/([^/]+)$/, (m, b) => api.actualizarMedicion(id(m), b)],
  ['DELETE', /^\/api\/mediciones\/([^/]+)$/, async (m) => [204, await api.eliminarMedicion(id(m))]],
  ['PUT', /^\/api\/planes\/([^/]+)$/, (m, b) => api.guardarPlan(db.porId('planes', id(m))?.pacienteId, b, id(m))],

  ['GET', /^\/api\/citas$/, (m, b, q) => api.listarCitas(q)],
  ['GET', /^\/api\/citas\/disponibilidad$/, (m, b, q) => api.horariosDisponibles(q.nutricionistaId, q.fecha, q.excluir ?? null)],
  ['GET', /^\/api\/citas\/([^/]+)\/historial$/, (m) => api.historialCita(id(m))],
  ['POST', /^\/api\/citas$/, async (m, b) => [201, await api.solicitarCita(b)]],
  ['PATCH', /^\/api\/citas\/([^/]+)\/confirmar$/, (m, b) => api.confirmarCita(id(m), b ?? {})],
  ['PATCH', /^\/api\/citas\/([^/]+)\/cancelar$/, (m, b) => api.cancelarCita(id(m), b?.motivo ?? '')],
  ['PATCH', /^\/api\/citas\/([^/]+)\/reprogramar$/, (m, b) => api.reprogramarCita(id(m), b)],
  ['PATCH', /^\/api\/citas\/([^/]+)\/asistencia$/, (m, b) => api.marcarAsistencia(id(m), b.asistio)],
  ['POST', /^\/api\/ausencias$/, async (m, b) => ({ afectadas: await api.registrarAusencia(b.nutricionistaId, b.fecha) })],

  ['GET', /^\/api\/notificaciones$/, () => api.misNotificaciones()],
  ['PATCH', /^\/api\/notificaciones\/leidas$/, async (m, b) => [204, await api.marcarNotificacionesLeidas(b?.ids ?? undefined)]],
  ['GET', /^\/api\/estadisticas$/, (m, b, q) => api.estadisticas(q)],
]

async function atender(entrada, opciones = {}) {
  const url = new URL(String(entrada), window.location.origin)
  const metodo = (opciones.method ?? 'GET').toUpperCase()
  const ruta = RUTAS.map(([met, patron, fn]) => met === metodo && [url.pathname.match(patron), fn]).find((r) => r && r[0])
  if (!ruta) return respuesta(404, { status: 404, mensaje: `Ruta simulada inexistente: ${metodo} ${url.pathname}` })

  // El "filtro JWT": el token de la cabecera Authorization identifica la sesión
  const bearer = opciones.headers?.Authorization?.replace(/^Bearer /, '')
  if (bearer) sessionStorage.setItem(TOKEN_KEY, bearer)
  else if (!url.pathname.startsWith('/api/auth/')) sessionStorage.removeItem(TOKEN_KEY)

  const query = Object.fromEntries(url.searchParams.entries())
  const cuerpo = opciones.body ? JSON.parse(opciones.body) : undefined
  try {
    const r = await ruta[1](ruta[0], cuerpo, query)
    const [status, datos] = Array.isArray(r) && typeof r[0] === 'number' ? r : [200, r]
    return respuesta(status, status === 204 ? undefined : (datos ?? null))
  } catch (e) {
    if (!e.status) throw e
    return respuesta(e.status, { status: e.status, mensaje: e.message, campos: e.campos ?? {} })
  }
}

// Se instala antes de cada prueba (src/test/entrada.js); Jasmine retira el spy al terminar.
export function instalarServidorFalso() {
  cookieRefresco = null
  return spyOn(window, 'fetch').and.callFake(atender)
}

// Simula que el backend revoca todas las sesiones (logout en otro dispositivo, cuenta desactivada…)
export function revocarSesiones() {
  db.reemplazar('sesiones', [])
}
