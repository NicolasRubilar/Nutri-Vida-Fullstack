// Cliente HTTP de la API REST (Spring Boot). Centraliza:
//  - la URL base (en desarrollo Vite redirige /api al backend en :8080, ver vite.config.js),
//  - el access token JWT, que vive solo en memoria (no en localStorage: un script inyectado no puede leerlo),
//  - la renovación automática con el refresh token de la cookie HttpOnly cuando el JWT vence,
//  - la traducción de errores HTTP a ApiError { status, message, campos }.

export const API_URL = (import.meta.env?.VITE_API_URL ?? '') + '/api'

// Marca no sensible que indica "hay una sesión que se puede restaurar al recargar".
// El token en sí nunca se guarda en el navegador fuera de la cookie HttpOnly.
export const MARCA_SESION = 'nv_sesion'

// Margen para renovar el JWT antes de que venza (evita peticiones que fallan por segundos)
const MARGEN_MS = 30_000

export class ApiError extends Error {
  constructor(status, mensaje, campos) {
    super(mensaje)
    this.status = status
    if (campos && Object.keys(campos).length) this.campos = campos
  }
}

let sesion = null // { accessToken, expiraEn, usuario }
let renovando = null

function marcar(activa) {
  try {
    if (activa) localStorage.setItem(MARCA_SESION, '1')
    else localStorage.removeItem(MARCA_SESION)
  } catch {
    /* almacenamiento bloqueado: la sesión dura solo mientras la pestaña esté abierta */
  }
}

export function guardarSesion(datos) {
  sesion = { accessToken: datos.accessToken, expiraEn: datos.expiraEn, usuario: datos.usuario }
  marcar(true)
  return sesion.usuario
}

export function limpiarSesion() {
  sesion = null
  renovando = null
  marcar(false)
}

export function usuarioEnSesion() {
  return sesion?.usuario ?? null
}

export function actualizarUsuarioEnSesion(usuario) {
  if (sesion) sesion = { ...sesion, usuario }
}

export function haySesionRestaurable() {
  try {
    return localStorage.getItem(MARCA_SESION) === '1'
  } catch {
    return false
  }
}

async function leerError(res) {
  let cuerpo = null
  try {
    cuerpo = await res.json()
  } catch {
    /* respuesta sin JSON */
  }
  const mensaje =
    cuerpo?.mensaje ??
    (res.status >= 500 ? 'El servidor no está disponible. Intenta nuevamente en unos minutos.' : `Error ${res.status}`)
  return new ApiError(res.status, mensaje, cuerpo?.campos)
}

async function enviar(metodo, ruta, { cuerpo, query, token } = {}) {
  const url = new URL(API_URL + ruta, window.location.origin)
  Object.entries(query ?? {}).forEach(([k, v]) => v != null && v !== '' && url.searchParams.set(k, v))
  const headers = {}
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    return await fetch(url, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      // Envía y recibe la cookie HttpOnly de renovación (solo viaja a /api/auth)
      credentials: 'include',
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión o que el backend esté iniciado.')
  }
}

// Pide un JWT nuevo con la cookie de renovación. Si varias peticiones lo necesitan a la vez,
// comparten la misma llamada (el refresh token se rota y solo sirve una vez).
export function renovarSesion() {
  renovando ??= enviar('POST', '/auth/refresh')
    .then(async (res) => {
      if (!res.ok) throw await leerError(res)
      return guardarSesion(await res.json())
    })
    .catch((e) => {
      limpiarSesion()
      throw e.status === 0 ? e : new ApiError(401, 'Tu sesión expiró. Inicia sesión nuevamente.')
    })
    .finally(() => {
      renovando = null
    })
  return renovando
}

// Petición a un endpoint protegido. Si el JWT está por vencer se renueva antes; si el servidor
// responde 401 (token vencido o revocado) se intenta renovar una vez y se repite la petición.
export async function peticion(metodo, ruta, opciones = {}) {
  if (!sesion) {
    if (!haySesionRestaurable()) throw new ApiError(401, 'Tu sesión expiró. Inicia sesión nuevamente.')
    await renovarSesion()
  } else if (sesion.expiraEn - MARGEN_MS < Date.now()) {
    await renovarSesion()
  }
  let res = await enviar(metodo, ruta, { ...opciones, token: sesion?.accessToken })
  if (res.status === 401) {
    await renovarSesion()
    res = await enviar(metodo, ruta, { ...opciones, token: sesion?.accessToken })
    if (res.status === 401) limpiarSesion()
  }
  if (!res.ok) throw await leerError(res)
  return res.status === 204 ? null : res.json()
}

// Petición a un endpoint público (login, registro, datos institucionales).
export async function peticionPublica(metodo, ruta, opciones = {}) {
  const res = await enviar(metodo, ruta, opciones)
  if (!res.ok) throw await leerError(res)
  return res.status === 204 ? null : res.json()
}

export const http = {
  get: (ruta, query) => peticion('GET', ruta, { query }),
  post: (ruta, cuerpo) => peticion('POST', ruta, { cuerpo }),
  put: (ruta, cuerpo) => peticion('PUT', ruta, { cuerpo }),
  patch: (ruta, cuerpo) => peticion('PATCH', ruta, { cuerpo }),
  delete: (ruta) => peticion('DELETE', ruta),
}
