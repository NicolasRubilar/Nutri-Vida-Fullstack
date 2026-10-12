export const ROLES = {
  ADMIN: 'admin',
  SECRETARIA: 'secretaria',
  NUTRICIONISTA: 'nutricionista',
  PACIENTE: 'paciente',
}

export const NOMBRE_ROL = {
  admin: 'Administrador',
  secretaria: 'Secretaria',
  nutricionista: 'Nutricionista',
  paciente: 'Paciente',
}

export const ESTADOS_CITA = {
  PENDIENTE: 'pendiente',
  CONFIRMADA: 'confirmada',
  CANCELADA: 'cancelada',
  ATENDIDA: 'atendida',
  INASISTENCIA: 'inasistencia',
}

export const NOMBRE_ESTADO = {
  pendiente: 'Pendiente de confirmación',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  atendida: 'Atendida',
  inasistencia: 'Inasistencia',
}

export const ESPECIALIDADES = [
  'Pérdida de peso',
  'Enfermedades metabólicas',
  'Nutrición deportiva',
  'Alimentación vegetariana y vegana',
]

export const MOTIVOS_CONSULTA = [
  'Primera consulta',
  'Control de seguimiento',
  'Pérdida de peso',
  'Control de diabetes / enfermedad metabólica',
  'Nutrición deportiva',
  'Alimentación vegetariana o vegana',
  'Otro',
]

// Bloques de atención (lunes a viernes)
export const HORARIOS = ['09:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00']

export const CLINICA = {
  nombre: 'Clínica Nutricional NutriVida',
  direccion: 'Av. Alemania 0945, Temuco, Región de La Araucanía',
  telefono: '+56 45 223 4567',
  email: 'contacto@nutrivida.cl',
  horario: 'Lunes a viernes, 09:00 – 13:00 y 15:00 – 19:00',
  lat: -38.7369,
  lng: -72.6139,
}

export const SESION_MINUTOS = 120
export const MAX_INTENTOS = 5
export const BLOQUEO_MINUTOS = 10

export const COMIDAS = [
  ['desayuno', 'Desayuno'],
  ['colacionAm', 'Colación de media mañana'],
  ['almuerzo', 'Almuerzo'],
  ['colacionPm', 'Once / colación de la tarde'],
  ['cena', 'Cena'],
]

// Prefijos de ruta restringidos por rol (deben coincidir con App.jsx)
const RUTAS_RESTRINGIDAS = [
  [['/mis-citas', '/progreso', '/plan'], ['paciente']],
  [['/agenda', '/pacientes'], ['admin', 'secretaria', 'nutricionista']],
  [['/admin'], ['admin']],
]

export function puedeAcceder(rutaCompleta, rol) {
  const ruta = rutaCompleta.split('?')[0]
  const regla = RUTAS_RESTRINGIDAS.find(([prefijos]) => prefijos.some((p) => ruta === p || ruta.startsWith(p + '/')))
  if (!regla) return true
  if (ruta.startsWith('/pacientes/') && rol === 'secretaria') return false
  return regla[1].includes(rol)
}

// Tras iniciar sesión vuelve a la vista pedida, si el rol tiene acceso a ella
export function destinoTrasLogin(desde, rol) {
  return desde && puedeAcceder(desde, rol) ? desde : '/'
}
