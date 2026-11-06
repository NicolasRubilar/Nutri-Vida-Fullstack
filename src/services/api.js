// Servicios de negocio: cada función llama a un endpoint de la API REST (Spring Boot).
// Las reglas (permisos por rol, privacidad clínica, validaciones, flujo de citas) se aplican en el
// backend; aquí solo se arma la petición. Las vistas no saben que hay HTTP de por medio: reciben
// los datos o un ApiError { status, message, campos }.

import { actualizarUsuarioEnSesion, http, peticionPublica } from './http'

const cita = (id, accion) => `/citas/${encodeURIComponent(id)}/${accion}`
const paciente = (id, recurso = '') => `/pacientes/${encodeURIComponent(id)}${recurso}`

// Los inputs numéricos entregan texto: se envían como número o null
const numero = (v) => (v === '' || v == null ? null : Number(v))

// ------------------------------------------------------------------ usuarios (administración)

export const listarUsuarios = () => http.get('/usuarios')

export const crearUsuario = (datos) => http.post('/usuarios', datos)

export const actualizarUsuario = (id, datos) => http.put(`/usuarios/${id}`, datos)

export const cambiarEstadoUsuario = (id, activo) => http.patch(`/usuarios/${id}/estado`, { activo })

export const eliminarUsuario = (id) => http.delete(`/usuarios/${id}`)

// ------------------------------------------------------------------ perfil propio

export async function actualizarMiPerfil(datos) {
  const usuario = await http.put('/perfil', datos)
  actualizarUsuarioEnSesion(usuario)
  return usuario
}

export const miPerfilPaciente = () => http.get('/perfil/paciente')

// ------------------------------------------------------------------ nutricionistas y pacientes

export const listarNutricionistas = () => http.get('/nutricionistas')

// Endpoint público (sin sesión) para la página de bienvenida: solo nombre y especialidad.
export const equipoPublico = () => peticionPublica('GET', '/publico/equipo')

export const listarPacientes = () => http.get('/pacientes')

export const obtenerPaciente = (id) => http.get(paciente(id))

export const asignarNutricionista = (pacienteId, nutricionistaId) => http.put(paciente(pacienteId, '/nutricionista'), { nutricionistaId })

// ------------------------------------------------------------------ ficha clínica, mediciones y planes

export const obtenerFicha = (pacienteId) => http.get(paciente(pacienteId, '/ficha'))

export const guardarFicha = (pacienteId, datos) => http.put(paciente(pacienteId, '/ficha'), datos)

export const listarMediciones = (pacienteId) => http.get(paciente(pacienteId, '/mediciones'))

function cuerpoMedicion(d) {
  return {
    fecha: d.fecha,
    peso: numero(d.peso),
    talla: numero(d.talla),
    cintura: numero(d.cintura),
    grasa: numero(d.grasa),
    notas: d.notas ?? '',
  }
}

export const registrarMedicion = (pacienteId, datos) => http.post(paciente(pacienteId, '/mediciones'), cuerpoMedicion(datos))

export const actualizarMedicion = (id, datos) => http.put(`/mediciones/${id}`, cuerpoMedicion(datos))

export const eliminarMedicion = (id) => http.delete(`/mediciones/${id}`)

export const listarPlanes = (pacienteId) => http.get(paciente(pacienteId, '/planes'))

// Sin planId crea un plan nuevo (pasa a ser el vigente); con planId edita ese plan.
export function guardarPlan(pacienteId, datos, planId = null) {
  const cuerpo = { ...datos, calorias: numero(datos.calorias) }
  return planId ? http.put(`/planes/${planId}`, cuerpo) : http.post(paciente(pacienteId, '/planes'), cuerpo)
}

export const eliminarPlan = (id) => http.delete(`/planes/${id}`)

// ------------------------------------------------------------------ citas (flujo de solicitudes)

export const listarCitas = ({ estado, desde, hasta, nutricionistaId, pacienteId } = {}) =>
  http.get('/citas', { estado, desde, hasta, nutricionistaId, pacienteId })

export const historialCita = (citaId) => http.get(cita(citaId, 'historial'))

export const horariosDisponibles = (nutricionistaId, fecha, excluirCitaId = null) =>
  http.get('/citas/disponibilidad', { nutricionistaId, fecha, excluir: excluirCitaId })

export const solicitarCita = ({ nutricionistaId, fecha, hora, motivo, comentario }) =>
  http.post('/citas', { nutricionistaId, fecha, hora, motivo, comentario })

export const confirmarCita = (id, { fecha, hora } = {}) => http.patch(cita(id, 'confirmar'), { fecha, hora })

export const cancelarCita = (id, motivo = '') => http.patch(cita(id, 'cancelar'), { motivo })

export const reprogramarCita = (id, { fecha, hora }) => http.patch(cita(id, 'reprogramar'), { fecha, hora })

export const marcarAsistencia = (id, asistio) => http.patch(cita(id, 'asistencia'), { asistio })

// Si un nutricionista se ausenta, sus citas del día quedan por reprogramar y cada paciente es avisado.
export async function registrarAusencia(nutricionistaId, fecha) {
  const { afectadas } = await http.post('/ausencias', { nutricionistaId, fecha })
  return afectadas
}

// ------------------------------------------------------------------ notificaciones

export const misNotificaciones = () => http.get('/notificaciones')

export const marcarNotificacionesLeidas = (ids) => http.patch('/notificaciones/leidas', { ids: ids ?? null })

// ------------------------------------------------------------------ estadísticas

export const estadisticas = ({ desde, hasta }) => http.get('/estadisticas', { desde, hasta })
