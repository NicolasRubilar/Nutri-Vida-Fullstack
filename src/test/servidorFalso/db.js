// Capa de persistencia sobre localStorage.
// Cada "tabla" se guarda como un arreglo JSON bajo su propia clave, imitando un
// modelo relacional normalizado (las relaciones se hacen por id). Cuando exista
// backend, esta capa se reemplaza por llamadas a la API REST sin tocar las vistas.

const PREFIX = 'nv_'

export const TABLAS = [
  'usuarios',
  'pacientes',
  'nutricionistas',
  'citas',
  'historialCitas',
  'fichas',
  'mediciones',
  'planes',
  'notificaciones',
  'sesiones',
]

function leer(tabla) {
  try {
    const raw = localStorage.getItem(PREFIX + tabla)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function escribir(tabla, filas) {
  localStorage.setItem(PREFIX + tabla, JSON.stringify(filas))
}

export function nuevoId() {
  return crypto.randomUUID()
}

export const db = {
  todos(tabla) {
    return leer(tabla)
  },
  buscar(tabla, predicado) {
    return leer(tabla).filter(predicado)
  },
  porId(tabla, id) {
    return leer(tabla).find((f) => f.id === id) ?? null
  },
  insertar(tabla, fila) {
    const filas = leer(tabla)
    const nueva = { id: nuevoId(), ...fila }
    filas.push(nueva)
    escribir(tabla, filas)
    return nueva
  },
  actualizar(tabla, id, cambios) {
    const filas = leer(tabla)
    const i = filas.findIndex((f) => f.id === id)
    if (i === -1) return null
    filas[i] = { ...filas[i], ...cambios, id }
    escribir(tabla, filas)
    return filas[i]
  },
  eliminar(tabla, id) {
    escribir(
      tabla,
      leer(tabla).filter((f) => f.id !== id),
    )
  },
  eliminarDonde(tabla, predicado) {
    escribir(
      tabla,
      leer(tabla).filter((f) => !predicado(f)),
    )
  },
  reemplazar(tabla, filas) {
    escribir(tabla, filas)
  },
  meta(clave, valor) {
    if (valor === undefined) return localStorage.getItem(PREFIX + 'meta_' + clave)
    localStorage.setItem(PREFIX + 'meta_' + clave, valor)
  },
  limpiarTodo() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  },
}
