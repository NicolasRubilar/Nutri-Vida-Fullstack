// Autenticación contra el backend (POST /api/auth/*).
//
// Gestión de la sesión en el navegador:
//  - El access token JWT (15 min) se guarda solo en memoria (variable del módulo http.js).
//  - El refresh token lo guarda el navegador en una cookie HttpOnly + SameSite=Strict que JavaScript
//    no puede leer; solo viaja a /api/auth. Por eso un ataque XSS no puede robar la sesión.
//  - Al recargar la página la memoria se pierde: restaurarSesion() pide un JWT nuevo con la cookie
//    y la sesión continúa sin volver a escribir la contraseña.
import {
  ApiError,
  guardarSesion,
  haySesionRestaurable,
  http,
  limpiarSesion,
  peticionPublica,
  renovarSesion,
  usuarioEnSesion,
} from './http'

export { ApiError, haySesionRestaurable }

// Usuario autenticado en esta pestaña (o null). Síncrono: lo usan el contexto y las rutas al montar.
export function sesionActual() {
  return usuarioEnSesion()
}

export async function iniciarSesion(email, password) {
  const sesion = await peticionPublica('POST', '/auth/login', { cuerpo: { email: email.trim(), password } })
  return guardarSesion(sesion)
}

// Registro público: el backend siempre crea la cuenta con rol paciente y deja la sesión iniciada.
export async function registrarPaciente(datos) {
  const sesion = await peticionPublica('POST', '/auth/registro', { cuerpo: datos })
  return guardarSesion(sesion)
}

// Recupera la sesión tras recargar la página (o en una pestaña nueva) usando la cookie de renovación.
export async function restaurarSesion() {
  if (usuarioEnSesion()) return usuarioEnSesion()
  if (!haySesionRestaurable()) return null
  try {
    return await renovarSesion()
  } catch {
    return null
  }
}

// Olvida el token de inmediato y pide al backend revocar el refresh token (borra la cookie).
export function cerrarSesion() {
  limpiarSesion()
  return peticionPublica('POST', '/auth/logout').catch(() => {})
}

// El backend invalida todos los tokens anteriores del usuario y entrega una sesión nueva para esta pestaña.
export async function cambiarPassword(actual, nueva) {
  guardarSesion(await http.put('/auth/password', { actual, nueva }))
}
