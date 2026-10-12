// Servicios de negocio. Cada función se comporta como un endpoint protegido:
// valida la sesión, verifica el rol y aplica las reglas de privacidad antes de
// leer o escribir. Son asíncronas para que, al conectar el backend Spring Boot,
// basta con reemplazar su cuerpo por un fetch() sin modificar las vistas.

import { db } from './db'
import { ApiError, crearCredenciales, requerir, sinDatosSensibles, validarDatosUsuario } from './auth'
import { ESTADOS_CITA, HORARIOS, NOMBRE_ESTADO, ROLES } from '../utils/constantes'
import { aFecha, esFinDeSemana, formatoFechaLarga, hoyISO, limpiarRut, nombreCompleto } from '../utils/formato'

const { ADMIN, SECRETARIA, NUTRICIONISTA, PACIENTE } = ROLES
const STAFF = [ADMIN, SECRETARIA, NUTRICIONISTA]

// ------------------------------------------------------------------ helpers

const pacienteDeUsuario = (usuarioId) => db.todos('pacientes').find((p) => p.usuarioId === usuarioId) ?? null
const nutriDeUsuario = (usuarioId) => db.todos('nutricionistas').find((n) => n.usuarioId === usuarioId) ?? null

function expandirNutri(n) {
  if (!n) return null
  const u = db.porId('usuarios', n.usuarioId)
  return { ...n, nombre: nombreCompleto(u), usuario: sinDatosSensibles(u) }
}

function expandirPaciente(p) {
  if (!p) return null
  const u = db.porId('usuarios', p.usuarioId)
  return {
    ...p,
    nombre: nombreCompleto(u),
    usuario: sinDatosSensibles(u),
    nutricionista: expandirNutri(db.porId('nutricionistas', p.nutricionistaId)),
  }
}

function expandirCita(c) {
  const p = db.porId('pacientes', c.pacienteId)
  const pu = p && db.porId('usuarios', p.usuarioId)
  return {
    ...c,
    paciente: p ? { id: p.id, nombre: nombreCompleto(pu), telefono: pu?.telefono, email: pu?.email } : null,
    nutricionista: expandirNutri(db.porId('nutricionistas', c.nutricionistaId)),
  }
}

// Regla de privacidad: solo el paciente y su nutricionista asignado (y el administrador) ven datos clínicos.
function verificarAccesoClinico(actor, pacienteId) {
  const paciente = db.porId('pacientes', pacienteId)
  if (!paciente) throw new ApiError(404, 'Paciente no encontrado.')
  if (actor.rol === ADMIN) return paciente
  if (actor.rol === PACIENTE && paciente.usuarioId === actor.id) return paciente
  if (actor.rol === NUTRICIONISTA && paciente.nutricionistaId === nutriDeUsuario(actor.id)?.id) return paciente
  throw new ApiError(403, 'No tienes acceso a los datos clínicos de este paciente.')
}

function verificarEdicionClinica(actor, pacienteId) {
  if (![ADMIN, NUTRICIONISTA].includes(actor.rol)) throw new ApiError(403, 'Solo el nutricionista puede editar la ficha.')
  return verificarAccesoClinico(actor, pacienteId)
}

function notificar(usuarioId, titulo, mensaje, tipo = 'info') {
  db.insertar('notificaciones', { usuarioId, titulo, mensaje, tipo, fecha: Date.now(), leida: false })
}

function registrarHistorial(citaId, estado, actor, comentario = '') {
  db.insertar('historialCitas', {
    citaId,
    estado,
    usuarioId: actor.id,
    actor: `${nombreCompleto(actor)} (${actor.rol})`,
    comentario,
    fecha: Date.now(),
  })
}

function errorValidacion(campos) {
  const e = new ApiError(422, 'Revisa los campos marcados.')
  e.campos = campos
  return e
}

const usuarioDePaciente = (pacienteId) => db.porId('pacientes', pacienteId)?.usuarioId
const descripcionCita = (c) => `${formatoFechaLarga(c.fecha)} a las ${c.hora}`

// ------------------------------------------------------------------ usuarios (administración)

export async function listarUsuarios() {
  requerir(ADMIN)
  return db.todos('usuarios').map((u) => {
    const n = u.rol === NUTRICIONISTA ? nutriDeUsuario(u.id) : null
    return { ...sinDatosSensibles(u), especialidad: n?.especialidad ?? '' }
  })
}

function asegurarPerfil(usuario, datos) {
  if (usuario.rol === NUTRICIONISTA) {
    const n = nutriDeUsuario(usuario.id)
    if (n) db.actualizar('nutricionistas', n.id, { especialidad: datos.especialidad ?? n.especialidad })
    else db.insertar('nutricionistas', { usuarioId: usuario.id, especialidad: datos.especialidad ?? '' })
  }
  if (usuario.rol === PACIENTE && !pacienteDeUsuario(usuario.id)) {
    db.insertar('pacientes', {
      usuarioId: usuario.id,
      fechaNacimiento: datos.fechaNacimiento ?? '',
      sexo: datos.sexo ?? '',
      nutricionistaId: null,
    })
  }
}

export async function crearUsuario(datos) {
  requerir(ADMIN)
  const errores = validarDatosUsuario(datos, { exigirPassword: true })
  if (!Object.values(ROLES).includes(datos.rol)) errores.rol = 'Selecciona un rol.'
  if (datos.rol === NUTRICIONISTA && !datos.especialidad) errores.especialidad = 'Selecciona la especialidad.'
  if (Object.keys(errores).length) throw errorValidacion(errores)
  const usuario = db.insertar('usuarios', {
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    rut: limpiarRut(datos.rut),
    email: datos.email.trim().toLowerCase(),
    telefono: datos.telefono?.trim() ?? '',
    rol: datos.rol,
    activo: true,
    creadoEn: Date.now(),
    ...(await crearCredenciales(datos.password)),
  })
  asegurarPerfil(usuario, datos)
  return sinDatosSensibles(usuario)
}

export async function actualizarUsuario(id, datos) {
  const actor = requerir(ADMIN)
  const existente = db.porId('usuarios', id)
  if (!existente) throw new ApiError(404, 'Usuario no encontrado.')
  const errores = validarDatosUsuario(datos, { idExcluido: id, exigirPassword: false })
  if (datos.rol === NUTRICIONISTA && !datos.especialidad) errores.especialidad = 'Selecciona la especialidad.'
  if (id === actor.id && datos.rol !== ADMIN) errores.rol = 'No puedes quitarte el rol de administrador.'
  if (Object.keys(errores).length) throw errorValidacion(errores)
  const cambios = {
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    rut: limpiarRut(datos.rut),
    email: datos.email.trim().toLowerCase(),
    telefono: datos.telefono?.trim() ?? '',
    rol: datos.rol,
  }
  if (datos.password) Object.assign(cambios, await crearCredenciales(datos.password), { intentosFallidos: 0, bloqueadoHasta: null })
  const usuario = db.actualizar('usuarios', id, cambios)
  asegurarPerfil(usuario, datos)
  // Un cambio de rol o de clave invalida sesiones abiertas de ese usuario
  if (datos.password || existente.rol !== datos.rol) db.eliminarDonde('sesiones', (s) => s.usuarioId === id)
  return sinDatosSensibles(usuario)
}

export async function cambiarEstadoUsuario(id, activo) {
  const actor = requerir(ADMIN)
  if (id === actor.id) throw new ApiError(409, 'No puedes desactivar tu propia cuenta.')
  const usuario = db.actualizar('usuarios', id, { activo })
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado.')
  if (!activo) db.eliminarDonde('sesiones', (s) => s.usuarioId === id)
  return sinDatosSensibles(usuario)
}

// ------------------------------------------------------------------ perfil propio

export async function actualizarMiPerfil(datos) {
  const yo = requerir()
  const usuario = db.porId('usuarios', yo.id)
  const errores = validarDatosUsuario({ ...usuario, ...datos, password: '' }, { idExcluido: yo.id })
  if (Object.keys(errores).length) throw errorValidacion(errores)
  const actualizado = db.actualizar('usuarios', yo.id, {
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    email: datos.email.trim().toLowerCase(),
    telefono: datos.telefono?.trim() ?? '',
  })
  if (yo.rol === PACIENTE) {
    const p = pacienteDeUsuario(yo.id)
    if (p) db.actualizar('pacientes', p.id, { fechaNacimiento: datos.fechaNacimiento ?? p.fechaNacimiento, sexo: datos.sexo ?? p.sexo })
  }
  return sinDatosSensibles(actualizado)
}

export async function miPerfilPaciente() {
  const yo = requerir(PACIENTE)
  return expandirPaciente(pacienteDeUsuario(yo.id))
}

// ------------------------------------------------------------------ nutricionistas y pacientes

export async function listarNutricionistas() {
  requerir()
  return db
    .todos('nutricionistas')
    .map(expandirNutri)
    .filter((n) => n.usuario?.activo)
}

// Endpoint público (sin sesión) para la página de bienvenida: solo nombre y especialidad, nada sensible.
export async function equipoPublico() {
  return db
    .todos('nutricionistas')
    .map((n) => ({ id: n.id, especialidad: n.especialidad, usuario: db.porId('usuarios', n.usuarioId) }))
    .filter((n) => n.usuario?.activo)
    .map(({ id, especialidad, usuario }) => ({ id, especialidad, nombre: nombreCompleto(usuario) }))
}

export async function listarPacientes() {
  const actor = requerir(...STAFF)
  let pacientes = db.todos('pacientes')
  if (actor.rol === NUTRICIONISTA) {
    const yo = nutriDeUsuario(actor.id)
    pacientes = pacientes.filter((p) => p.nutricionistaId === yo?.id)
  }
  const citas = db.todos('citas')
  const mediciones = db.todos('mediciones')
  const hoy = hoyISO()
  return pacientes
    .map(expandirPaciente)
    .filter((p) => p.usuario)
    .map((p) => {
      const proxima = citas
        .filter((c) => c.pacienteId === p.id && c.estado === ESTADOS_CITA.CONFIRMADA && c.fecha >= hoy)
        .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0]
      // La secretaria no recibe datos clínicos
      const ultima =
        actor.rol === SECRETARIA
          ? null
          : mediciones.filter((m) => m.pacienteId === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
      return { ...p, proximaCita: proxima ?? null, ultimaMedicion: ultima ?? null }
    })
}

export async function obtenerPaciente(pacienteId) {
  const actor = requerir()
  if (actor.rol === SECRETARIA) {
    const p = db.porId('pacientes', pacienteId)
    if (!p) throw new ApiError(404, 'Paciente no encontrado.')
    return expandirPaciente(p)
  }
  return expandirPaciente(verificarAccesoClinico(actor, pacienteId))
}

export async function asignarNutricionista(pacienteId, nutricionistaId) {
  requerir(ADMIN, SECRETARIA)
  const p = db.actualizar('pacientes', pacienteId, { nutricionistaId })
  if (!p) throw new ApiError(404, 'Paciente no encontrado.')
  const n = expandirNutri(db.porId('nutricionistas', nutricionistaId))
  notificar(p.usuarioId, 'Nutricionista asignado', `Desde ahora te atiende ${n?.nombre}. Tu historial se mantiene completo.`)
  return expandirPaciente(p)
}

// ------------------------------------------------------------------ ficha clínica, mediciones y planes

export async function obtenerFicha(pacienteId) {
  const actor = requerir()
  verificarAccesoClinico(actor, pacienteId)
  return db.todos('fichas').find((f) => f.pacienteId === pacienteId) ?? null
}

export async function guardarFicha(pacienteId, datos) {
  const actor = requerir()
  verificarEdicionClinica(actor, pacienteId)
  const existente = db.todos('fichas').find((f) => f.pacienteId === pacienteId)
  const fila = {
    pacienteId,
    diagnostico: datos.diagnostico ?? '',
    antecedentes: datos.antecedentes ?? '',
    alergias: datos.alergias ?? '',
    medicamentos: datos.medicamentos ?? '',
    objetivo: datos.objetivo ?? '',
    actualizadaEn: Date.now(),
    actualizadaPor: nombreCompleto(actor),
  }
  return existente ? db.actualizar('fichas', existente.id, fila) : db.insertar('fichas', fila)
}

export async function listarMediciones(pacienteId) {
  const actor = requerir()
  verificarAccesoClinico(actor, pacienteId)
  return db
    .buscar('mediciones', (m) => m.pacienteId === pacienteId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((m) => ({ ...m, nutricionista: expandirNutri(db.porId('nutricionistas', m.nutricionistaId))?.nombre ?? '—' }))
}

function validarMedicion(d) {
  const e = {}
  const rango = (v, min, max) => v === '' || v == null || (Number(v) >= min && Number(v) <= max)
  if (!d.fecha) e.fecha = 'Indica la fecha.'
  else if (d.fecha > hoyISO()) e.fecha = 'La fecha no puede ser futura.'
  if (!d.peso || !rango(d.peso, 20, 350)) e.peso = 'Peso entre 20 y 350 kg.'
  if (!d.talla || !rango(d.talla, 80, 250)) e.talla = 'Talla entre 80 y 250 cm.'
  if (!rango(d.cintura, 30, 250)) e.cintura = 'Cintura entre 30 y 250 cm.'
  if (!rango(d.grasa, 2, 70)) e.grasa = '% grasa entre 2 y 70.'
  if (Object.keys(e).length) throw errorValidacion(e)
  const num = (v) => (v === '' || v == null ? null : Number(v))
  return {
    fecha: d.fecha,
    peso: num(d.peso),
    talla: num(d.talla),
    cintura: num(d.cintura),
    grasa: num(d.grasa),
    notas: d.notas?.trim() ?? '',
  }
}

export async function registrarMedicion(pacienteId, datos) {
  const actor = requerir()
  const paciente = verificarEdicionClinica(actor, pacienteId)
  const m = db.insertar('mediciones', {
    pacienteId,
    nutricionistaId: nutriDeUsuario(actor.id)?.id ?? paciente.nutricionistaId,
    ...validarMedicion(datos),
  })
  notificar(paciente.usuarioId, 'Nueva medición registrada', 'Tu nutricionista registró una nueva medición. Revisa tu progreso.', 'progreso')
  return m
}

export async function actualizarMedicion(id, datos) {
  const actor = requerir()
  const m = db.porId('mediciones', id)
  if (!m) throw new ApiError(404, 'Medición no encontrada.')
  verificarEdicionClinica(actor, m.pacienteId)
  return db.actualizar('mediciones', id, validarMedicion(datos))
}

export async function eliminarMedicion(id) {
  const actor = requerir()
  const m = db.porId('mediciones', id)
  if (!m) throw new ApiError(404, 'Medición no encontrada.')
  verificarEdicionClinica(actor, m.pacienteId)
  db.eliminar('mediciones', id)
}

export async function listarPlanes(pacienteId) {
  const actor = requerir()
  verificarAccesoClinico(actor, pacienteId)
  return db
    .buscar('planes', (p) => p.pacienteId === pacienteId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((p) => ({ ...p, nutricionista: expandirNutri(db.porId('nutricionistas', p.nutricionistaId))?.nombre ?? '—' }))
}

export async function guardarPlan(pacienteId, datos, planId = null) {
  const actor = requerir()
  const paciente = verificarEdicionClinica(actor, pacienteId)
  const e = {}
  if (!datos.objetivo?.trim()) e.objetivo = 'Indica el objetivo del plan.'
  if (datos.calorias && (datos.calorias < 800 || datos.calorias > 6000)) e.calorias = 'Calorías entre 800 y 6000.'
  if (!datos.almuerzo?.trim()) e.almuerzo = 'Indica al menos el almuerzo.'
  if (Object.keys(e).length) throw errorValidacion(e)
  const fila = {
    objetivo: datos.objetivo.trim(),
    calorias: datos.calorias ? Number(datos.calorias) : null,
    desayuno: datos.desayuno ?? '',
    colacionAm: datos.colacionAm ?? '',
    almuerzo: datos.almuerzo ?? '',
    colacionPm: datos.colacionPm ?? '',
    cena: datos.cena ?? '',
    indicaciones: datos.indicaciones ?? '',
  }
  if (planId) return db.actualizar('planes', planId, fila)
  // Un plan nuevo reemplaza al vigente
  db.buscar('planes', (p) => p.pacienteId === pacienteId && p.vigente).forEach((p) =>
    db.actualizar('planes', p.id, { vigente: false }),
  )
  const plan = db.insertar('planes', {
    pacienteId,
    nutricionistaId: nutriDeUsuario(actor.id)?.id ?? paciente.nutricionistaId,
    fecha: hoyISO(),
    vigente: true,
    ...fila,
  })
  notificar(paciente.usuarioId, 'Nuevo plan alimenticio', 'Tienes un nuevo plan alimenticio disponible.', 'plan')
  return plan
}

// ------------------------------------------------------------------ citas (flujo de solicitudes)

export async function listarCitas({ estado, desde, hasta, nutricionistaId, pacienteId } = {}) {
  const actor = requerir()
  let citas = db.todos('citas')
  if (actor.rol === PACIENTE) citas = citas.filter((c) => c.pacienteId === pacienteDeUsuario(actor.id)?.id)
  if (actor.rol === NUTRICIONISTA) citas = citas.filter((c) => c.nutricionistaId === nutriDeUsuario(actor.id)?.id)
  if (estado) citas = citas.filter((c) => c.estado === estado)
  if (desde) citas = citas.filter((c) => c.fecha >= desde)
  if (hasta) citas = citas.filter((c) => c.fecha <= hasta)
  if (nutricionistaId) citas = citas.filter((c) => c.nutricionistaId === nutricionistaId)
  if (pacienteId) citas = citas.filter((c) => c.pacienteId === pacienteId)
  return citas.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).map(expandirCita)
}

export async function historialCita(citaId) {
  const actor = requerir()
  const cita = db.porId('citas', citaId)
  if (!cita) throw new ApiError(404, 'Cita no encontrada.')
  verificarAccesoCita(actor, cita)
  return db.buscar('historialCitas', (h) => h.citaId === citaId).sort((a, b) => a.fecha - b.fecha)
}

function verificarAccesoCita(actor, cita) {
  if (actor.rol === ADMIN || actor.rol === SECRETARIA) return
  if (actor.rol === PACIENTE && cita.pacienteId === pacienteDeUsuario(actor.id)?.id) return
  if (actor.rol === NUTRICIONISTA && cita.nutricionistaId === nutriDeUsuario(actor.id)?.id) return
  throw new ApiError(403, 'No tienes acceso a esta cita.')
}

const ACTIVAS = [ESTADOS_CITA.PENDIENTE, ESTADOS_CITA.CONFIRMADA]

export async function horariosDisponibles(nutricionistaId, fecha, excluirCitaId = null) {
  requerir()
  if (!fecha || esFinDeSemana(fecha)) return []
  const ocupados = new Set(
    db
      .buscar(
        'citas',
        (c) => c.nutricionistaId === nutricionistaId && c.fecha === fecha && ACTIVAS.includes(c.estado) && c.id !== excluirCitaId,
      )
      .map((c) => c.hora),
  )
  const ahora = new Date()
  return HORARIOS.filter((h) => !ocupados.has(h) && aFecha(fecha, h) > ahora)
}

async function validarHorario(nutricionistaId, fecha, hora, excluirCitaId) {
  const e = {}
  if (!nutricionistaId) e.nutricionistaId = 'Selecciona un nutricionista.'
  if (!fecha) e.fecha = 'Selecciona una fecha.'
  else if (esFinDeSemana(fecha)) e.fecha = 'La clínica atiende de lunes a viernes.'
  if (!hora) e.hora = 'Selecciona un horario.'
  if (Object.keys(e).length) throw errorValidacion(e)
  const libres = await horariosDisponibles(nutricionistaId, fecha, excluirCitaId)
  if (!libres.includes(hora)) throw errorValidacion({ hora: 'Ese horario ya no está disponible.' })
}

export async function solicitarCita({ nutricionistaId, fecha, hora, motivo, comentario }) {
  const actor = requerir(PACIENTE)
  const paciente = pacienteDeUsuario(actor.id)
  if (!motivo) throw errorValidacion({ motivo: 'Indica el motivo de la consulta.' })
  await validarHorario(nutricionistaId, fecha, hora)
  const cita = db.insertar('citas', {
    pacienteId: paciente.id,
    nutricionistaId,
    fecha,
    hora,
    motivo,
    comentario: comentario?.trim() ?? '',
    estado: ESTADOS_CITA.PENDIENTE,
    creadaEn: Date.now(),
    recordatorioEnviado: false,
  })
  registrarHistorial(cita.id, ESTADOS_CITA.PENDIENTE, actor, 'Solicitud creada por el paciente')
  const nutri = db.porId('nutricionistas', nutricionistaId)
  notificar(nutri.usuarioId, 'Nueva solicitud de cita', `${nombreCompleto(actor)} solicitó una cita para el ${descripcionCita(cita)}.`, 'cita')
  return expandirCita(cita)
}

export async function confirmarCita(id, { fecha, hora } = {}) {
  const actor = requerir(ADMIN, SECRETARIA, NUTRICIONISTA)
  const cita = db.porId('citas', id)
  if (!cita) throw new ApiError(404, 'Cita no encontrada.')
  verificarAccesoCita(actor, cita)
  if (cita.estado !== ESTADOS_CITA.PENDIENTE) throw new ApiError(409, 'Solo se pueden confirmar citas pendientes.')
  const nuevaFecha = fecha ?? cita.fecha
  const nuevaHora = hora ?? cita.hora
  await validarHorario(cita.nutricionistaId, nuevaFecha, nuevaHora, id)
  const actualizada = db.actualizar('citas', id, {
    fecha: nuevaFecha,
    hora: nuevaHora,
    estado: ESTADOS_CITA.CONFIRMADA,
    requiereReprogramacion: false,
    recordatorioEnviado: false,
  })
  const cambio = nuevaFecha !== cita.fecha || nuevaHora !== cita.hora
  registrarHistorial(id, ESTADOS_CITA.CONFIRMADA, actor, cambio ? `Confirmada con nuevo horario: ${descripcionCita(actualizada)}` : 'Horario confirmado')
  // Al confirmar, el paciente queda asignado a ese nutricionista (comparte el historial completo)
  const paciente = db.porId('pacientes', cita.pacienteId)
  if (paciente.nutricionistaId !== cita.nutricionistaId) db.actualizar('pacientes', paciente.id, { nutricionistaId: cita.nutricionistaId })
  notificar(paciente.usuarioId, 'Cita confirmada', `Tu cita quedó confirmada para el ${descripcionCita(actualizada)}.`, 'cita')
  generarRecordatorios()
  return expandirCita(actualizada)
}

export async function cancelarCita(id, motivo = '') {
  const actor = requerir()
  const cita = db.porId('citas', id)
  if (!cita) throw new ApiError(404, 'Cita no encontrada.')
  verificarAccesoCita(actor, cita)
  if (!ACTIVAS.includes(cita.estado)) throw new ApiError(409, 'Esta cita ya no se puede cancelar.')
  const actualizada = db.actualizar('citas', id, { estado: ESTADOS_CITA.CANCELADA, motivoCancelacion: motivo })
  registrarHistorial(id, ESTADOS_CITA.CANCELADA, actor, motivo || 'Cancelada')
  const nutri = db.porId('nutricionistas', cita.nutricionistaId)
  if (actor.rol === PACIENTE) {
    notificar(nutri.usuarioId, 'Cita cancelada', `${nombreCompleto(actor)} canceló su cita del ${descripcionCita(cita)}.`, 'cita')
  } else {
    notificar(usuarioDePaciente(cita.pacienteId), 'Cita cancelada', `Tu cita del ${descripcionCita(cita)} fue cancelada por la clínica. ${motivo}`, 'alerta')
  }
  return expandirCita(actualizada)
}

// El paciente propone un nuevo horario (vuelve a quedar pendiente);
// el personal de la clínica lo reprograma directamente (queda confirmada).
export async function reprogramarCita(id, { fecha, hora }) {
  const actor = requerir()
  const cita = db.porId('citas', id)
  if (!cita) throw new ApiError(404, 'Cita no encontrada.')
  verificarAccesoCita(actor, cita)
  if (!ACTIVAS.includes(cita.estado)) throw new ApiError(409, 'Esta cita ya no se puede reprogramar.')
  await validarHorario(cita.nutricionistaId, fecha, hora, id)
  const esPaciente = actor.rol === PACIENTE
  const estado = esPaciente ? ESTADOS_CITA.PENDIENTE : ESTADOS_CITA.CONFIRMADA
  const actualizada = db.actualizar('citas', id, { fecha, hora, estado, requiereReprogramacion: false, recordatorioEnviado: false })
  registrarHistorial(id, estado, actor, `Reprogramada al ${descripcionCita(actualizada)}`)
  if (esPaciente) {
    const nutri = db.porId('nutricionistas', cita.nutricionistaId)
    notificar(nutri.usuarioId, 'Solicitud de reprogramación', `${nombreCompleto(actor)} pidió cambiar su cita al ${descripcionCita(actualizada)}.`, 'cita')
  } else {
    notificar(usuarioDePaciente(cita.pacienteId), 'Cita reprogramada', `Tu cita fue movida al ${descripcionCita(actualizada)}.`, 'cita')
  }
  generarRecordatorios()
  return expandirCita(actualizada)
}

export async function marcarAsistencia(id, asistio) {
  const actor = requerir(ADMIN, SECRETARIA, NUTRICIONISTA)
  const cita = db.porId('citas', id)
  if (!cita) throw new ApiError(404, 'Cita no encontrada.')
  verificarAccesoCita(actor, cita)
  if (cita.estado !== ESTADOS_CITA.CONFIRMADA) throw new ApiError(409, 'Solo se registra asistencia en citas confirmadas.')
  if (cita.fecha > hoyISO()) throw new ApiError(409, 'No puedes registrar asistencia de una cita futura.')
  const estado = asistio ? ESTADOS_CITA.ATENDIDA : ESTADOS_CITA.INASISTENCIA
  registrarHistorial(id, estado, actor, NOMBRE_ESTADO[estado])
  return expandirCita(db.actualizar('citas', id, { estado }))
}

// Si un nutricionista se ausenta, todas sus citas del día quedan marcadas para
// reprogramar y cada paciente recibe un aviso automático (sin llamadas una a una).
export async function registrarAusencia(nutricionistaId, fecha) {
  const actor = requerir(ADMIN, SECRETARIA)
  const afectadas = db.buscar('citas', (c) => c.nutricionistaId === nutricionistaId && c.fecha === fecha && ACTIVAS.includes(c.estado))
  afectadas.forEach((c) => {
    db.actualizar('citas', c.id, { estado: ESTADOS_CITA.PENDIENTE, requiereReprogramacion: true })
    registrarHistorial(c.id, ESTADOS_CITA.PENDIENTE, actor, 'Nutricionista ausente: requiere reprogramación')
    notificar(
      usuarioDePaciente(c.pacienteId),
      'Tu cita debe reprogramarse',
      `Tu nutricionista no podrá atender el ${descripcionCita(c)}. Elige un nuevo horario en "Mis citas" o espera la propuesta de la clínica.`,
      'alerta',
    )
  })
  return afectadas.length
}

// ------------------------------------------------------------------ notificaciones y recordatorios

// Simula el proceso programado del servidor: crea un recordatorio para cada cita
// confirmada que ocurre dentro de las próximas 48 horas.
export function generarRecordatorios() {
  const ahora = Date.now()
  const limite = ahora + 48 * 3_600_000
  db.buscar('citas', (c) => c.estado === ESTADOS_CITA.CONFIRMADA && !c.recordatorioEnviado).forEach((c) => {
    const t = aFecha(c.fecha, c.hora).getTime()
    if (t > ahora && t <= limite) {
      const nutri = expandirNutri(db.porId('nutricionistas', c.nutricionistaId))
      notificar(
        usuarioDePaciente(c.pacienteId),
        'Recordatorio de cita',
        `Te esperamos el ${descripcionCita(c)} con ${nutri?.nombre}. Si no puedes asistir, cancela o reprograma desde "Mis citas".`,
        'recordatorio',
      )
      db.actualizar('citas', c.id, { recordatorioEnviado: true })
    }
  })
}

export async function misNotificaciones() {
  const yo = requerir()
  return db.buscar('notificaciones', (n) => n.usuarioId === yo.id).sort((a, b) => b.fecha - a.fecha)
}

export async function marcarNotificacionesLeidas(ids) {
  const yo = requerir()
  db.buscar('notificaciones', (n) => n.usuarioId === yo.id && (!ids || ids.includes(n.id))).forEach((n) =>
    db.actualizar('notificaciones', n.id, { leida: true }),
  )
}

// ------------------------------------------------------------------ estadísticas

export async function estadisticas({ desde, hasta }) {
  requerir(ADMIN)
  const citas = db.buscar('citas', (c) => (!desde || c.fecha >= desde) && (!hasta || c.fecha <= hasta))
  const contar = (estado, lista = citas) => lista.filter((c) => c.estado === estado).length
  const tasa = (lista) => {
    const atendidas = contar(ESTADOS_CITA.ATENDIDA, lista)
    const faltas = contar(ESTADOS_CITA.INASISTENCIA, lista)
    return atendidas + faltas ? faltas / (atendidas + faltas) : 0
  }

  const porNutricionista = db.todos('nutricionistas').map((n) => {
    const propias = citas.filter((c) => c.nutricionistaId === n.id)
    return {
      id: n.id,
      nombre: expandirNutri(n).nombre,
      especialidad: n.especialidad,
      total: propias.length,
      atendidas: contar(ESTADOS_CITA.ATENDIDA, propias),
      inasistencias: contar(ESTADOS_CITA.INASISTENCIA, propias),
      tasaInasistencia: tasa(propias),
      pacientes: db.buscar('pacientes', (p) => p.nutricionistaId === n.id).length,
    }
  })

  const meses = {}
  citas.forEach((c) => {
    const mes = c.fecha.slice(0, 7)
    meses[mes] ??= { mes, atendidas: 0, inasistencias: 0 }
    if (c.estado === ESTADOS_CITA.ATENDIDA) meses[mes].atendidas++
    if (c.estado === ESTADOS_CITA.INASISTENCIA) meses[mes].inasistencias++
  })

  const motivos = {}
  citas.forEach((c) => (motivos[c.motivo] = (motivos[c.motivo] ?? 0) + 1))

  const usuarios = db.todos('usuarios')
  return {
    total: citas.length,
    porEstado: Object.values(ESTADOS_CITA).map((e) => ({ estado: e, cantidad: contar(e) })),
    tasaInasistencia: tasa(citas),
    porNutricionista,
    porMes: Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes)),
    porMotivo: Object.entries(motivos)
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad),
    usuariosPorRol: Object.values(ROLES).map((rol) => ({ rol, cantidad: usuarios.filter((u) => u.rol === rol && u.activo).length })),
    pacientesActivos: usuarios.filter((u) => u.rol === PACIENTE && u.activo).length,
  }
}
