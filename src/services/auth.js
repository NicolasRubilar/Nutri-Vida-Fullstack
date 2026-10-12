import { db } from './db'
import { generarSal, generarToken, hashPassword, iguales } from './crypto'
import { BLOQUEO_MINUTOS, MAX_INTENTOS, ROLES, SESION_MINUTOS } from '../utils/constantes'
import { limpiarRut, validarEmail, validarPassword, validarRut } from '../utils/formato'

const TOKEN_KEY = 'nv_token'

// Error con código tipo HTTP, para que las vistas lo traten igual que una respuesta REST.
export class ApiError extends Error {
  constructor(status, mensaje) {
    super(mensaje)
    this.status = status
  }
}

export function sinDatosSensibles(usuario) {
  if (!usuario) return null
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, sal, intentosFallidos, bloqueadoHasta, ...publico } = usuario
  return publico
}

export async function crearCredenciales(password) {
  const sal = generarSal()
  return { sal, passwordHash: await hashPassword(password, sal) }
}

function leerToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

// Devuelve el usuario autenticado si el token es válido; si no, null.
export function sesionActual() {
  const token = leerToken()
  if (!token) return null
  const sesion = db.todos('sesiones').find((s) => s.token === token)
  if (!sesion || sesion.expiraEn < Date.now()) {
    if (sesion) db.eliminar('sesiones', sesion.id)
    sessionStorage.removeItem(TOKEN_KEY)
    return null
  }
  const usuario = db.porId('usuarios', sesion.usuarioId)
  if (!usuario || !usuario.activo) {
    cerrarSesion()
    return null
  }
  // Renovación deslizante de la sesión
  db.actualizar('sesiones', sesion.id, { expiraEn: Date.now() + SESION_MINUTOS * 60_000 })
  return sinDatosSensibles(usuario)
}

// Equivalente al filtro de seguridad de un endpoint: exige token válido y rol permitido.
export function requerir(...roles) {
  const usuario = sesionActual()
  if (!usuario) throw new ApiError(401, 'Tu sesión expiró. Inicia sesión nuevamente.')
  if (roles.length && !roles.includes(usuario.rol)) {
    throw new ApiError(403, 'No tienes permisos para realizar esta acción.')
  }
  return usuario
}

export async function iniciarSesion(email, password) {
  const correo = email.trim().toLowerCase()
  const usuario = db.todos('usuarios').find((u) => u.email === correo)
  const mensajeGenerico = 'Correo o contraseña incorrectos.'

  if (!usuario) {
    // Se calcula un hash igualmente para no revelar si el correo existe
    await hashPassword(password, generarSal())
    throw new ApiError(401, mensajeGenerico)
  }
  if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > Date.now()) {
    const min = Math.ceil((usuario.bloqueadoHasta - Date.now()) / 60_000)
    throw new ApiError(423, `Cuenta bloqueada temporalmente por intentos fallidos. Intenta en ${min} min.`)
  }

  const hash = await hashPassword(password, usuario.sal)
  if (!iguales(hash, usuario.passwordHash)) {
    const intentos = (usuario.intentosFallidos ?? 0) + 1
    const bloquear = intentos >= MAX_INTENTOS
    db.actualizar('usuarios', usuario.id, {
      intentosFallidos: bloquear ? 0 : intentos,
      bloqueadoHasta: bloquear ? Date.now() + BLOQUEO_MINUTOS * 60_000 : null,
    })
    throw new ApiError(
      401,
      bloquear
        ? `Demasiados intentos. Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos.`
        : `${mensajeGenerico} Te quedan ${MAX_INTENTOS - intentos} intentos.`,
    )
  }
  if (!usuario.activo) {
    throw new ApiError(403, 'Tu cuenta está desactivada. Contacta a la clínica.')
  }

  db.actualizar('usuarios', usuario.id, { intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: Date.now() })
  // Limpia sesiones vencidas
  db.eliminarDonde('sesiones', (s) => s.expiraEn < Date.now())
  const token = generarToken()
  db.insertar('sesiones', {
    token,
    usuarioId: usuario.id,
    creadaEn: Date.now(),
    expiraEn: Date.now() + SESION_MINUTOS * 60_000,
  })
  sessionStorage.setItem(TOKEN_KEY, token)
  return sinDatosSensibles(db.porId('usuarios', usuario.id))
}

export function cerrarSesion() {
  const token = leerToken()
  if (token) db.eliminarDonde('sesiones', (s) => s.token === token)
  sessionStorage.removeItem(TOKEN_KEY)
}

export function validarDatosUsuario(datos, { idExcluido, exigirPassword }) {
  const errores = {}
  if (!datos.nombre?.trim()) errores.nombre = 'Ingresa el nombre.'
  if (!datos.apellido?.trim()) errores.apellido = 'Ingresa el apellido.'
  if (!validarRut(datos.rut ?? '')) errores.rut = 'RUT inválido.'
  if (!validarEmail(datos.email ?? '')) errores.email = 'Correo inválido.'
  if (datos.telefono && !/^\+?[\d\s]{8,15}$/.test(datos.telefono)) errores.telefono = 'Teléfono inválido.'
  if (exigirPassword || datos.password) {
    const faltas = validarPassword(datos.password ?? '')
    if (faltas.length) errores.password = `La contraseña debe tener ${faltas.join(', ')}.`
  }
  const usuarios = db.todos('usuarios').filter((u) => u.id !== idExcluido)
  if (usuarios.some((u) => u.email === datos.email?.trim().toLowerCase())) {
    errores.email = 'Ya existe una cuenta con este correo.'
  }
  if (usuarios.some((u) => limpiarRut(u.rut) === limpiarRut(datos.rut ?? ''))) {
    errores.rut = 'Ya existe una cuenta con este RUT.'
  }
  return errores
}

// Registro público: solo crea cuentas con rol Paciente.
export async function registrarPaciente(datos) {
  const errores = validarDatosUsuario(datos, { exigirPassword: true })
  if (!datos.fechaNacimiento) errores.fechaNacimiento = 'Ingresa tu fecha de nacimiento.'
  if (Object.keys(errores).length) {
    const e = new ApiError(422, 'Revisa los campos marcados.')
    e.campos = errores
    throw e
  }
  const usuario = db.insertar('usuarios', {
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    rut: limpiarRut(datos.rut),
    email: datos.email.trim().toLowerCase(),
    telefono: datos.telefono?.trim() ?? '',
    rol: ROLES.PACIENTE,
    activo: true,
    creadoEn: Date.now(),
    ...(await crearCredenciales(datos.password)),
  })
  db.insertar('pacientes', {
    usuarioId: usuario.id,
    fechaNacimiento: datos.fechaNacimiento,
    sexo: datos.sexo ?? '',
    nutricionistaId: null,
  })
  return iniciarSesion(datos.email, datos.password)
}

export async function cambiarPassword(actual, nueva) {
  const yo = requerir()
  const usuario = db.porId('usuarios', yo.id)
  const hash = await hashPassword(actual, usuario.sal)
  // 422 y no 401: la sesión sigue siendo válida, solo el dato ingresado es incorrecto
  if (!iguales(hash, usuario.passwordHash)) throw new ApiError(422, 'La contraseña actual no es correcta.')
  const faltas = validarPassword(nueva)
  if (faltas.length) throw new ApiError(422, `La nueva contraseña debe tener ${faltas.join(', ')}.`)
  db.actualizar('usuarios', yo.id, await crearCredenciales(nueva))
  // Invalida las demás sesiones del usuario
  const token = leerToken()
  db.eliminarDonde('sesiones', (s) => s.usuarioId === yo.id && s.token !== token)
}
