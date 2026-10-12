// Fechas se manejan como texto 'YYYY-MM-DD' (fecha local) para evitar desfases de zona horaria.

export function hoyISO() {
  return fechaISO(new Date())
}

export function fechaISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function sumarDias(iso, dias) {
  const d = aFecha(iso)
  d.setDate(d.getDate() + dias)
  return fechaISO(d)
}

export function aFecha(iso, hora = '00:00') {
  const [y, m, d] = iso.split('-').map(Number)
  const [h, min] = hora.split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

export function esFinDeSemana(iso) {
  const dia = aFecha(iso).getDay()
  return dia === 0 || dia === 6
}

export function formatoFecha(iso, opciones = {}) {
  if (!iso) return '—'
  return aFecha(iso).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opciones,
  })
}

export function formatoFechaLarga(iso) {
  if (!iso) return '—'
  return aFecha(iso).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatoFechaHora(timestamp) {
  return new Date(timestamp).toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function edad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const n = aFecha(fechaNacimiento)
  const h = new Date()
  let e = h.getFullYear() - n.getFullYear()
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--
  return e
}

export function calcularIMC(peso, tallaCm) {
  if (!peso || !tallaCm) return null
  const t = tallaCm / 100
  return Math.round((peso / (t * t)) * 10) / 10
}

export function categoriaIMC(imc) {
  if (imc == null) return ''
  if (imc < 18.5) return 'Bajo peso'
  if (imc < 25) return 'Normal'
  if (imc < 30) return 'Sobrepeso'
  return 'Obesidad'
}

export function nombreCompleto(u) {
  return u ? `${u.nombre} ${u.apellido}` : '—'
}

export function iniciales(u) {
  return u ? `${u.nombre[0] ?? ''}${u.apellido[0] ?? ''}`.toUpperCase() : '?'
}

// ---- RUT chileno ----
export function limpiarRut(rut) {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase()
}

export function validarRut(rut) {
  const r = limpiarRut(rut)
  if (r.length < 8 || r.length > 9) return false
  const cuerpo = r.slice(0, -1)
  const dv = r.slice(-1)
  let suma = 0
  let mult = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult
    mult = mult === 7 ? 2 : mult + 1
  }
  const res = 11 - (suma % 11)
  const esperado = res === 11 ? '0' : res === 10 ? 'K' : String(res)
  return dv === esperado
}

export function formatearRut(rut) {
  const r = limpiarRut(rut)
  if (r.length < 2) return r
  const cuerpo = r.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cuerpo}-${r.slice(-1)}`
}

export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

// Mínimo 8 caracteres, una mayúscula, una minúscula y un número
export function validarPassword(p) {
  const errores = []
  if (p.length < 8) errores.push('al menos 8 caracteres')
  if (!/[A-Z]/.test(p)) errores.push('una mayúscula')
  if (!/[a-z]/.test(p)) errores.push('una minúscula')
  if (!/\d/.test(p)) errores.push('un número')
  return errores
}
