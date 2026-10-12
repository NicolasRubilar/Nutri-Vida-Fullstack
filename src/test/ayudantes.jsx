// Utilidades compartidas por las pruebas.
import { act } from 'react'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '../context/AuthContext'
import Layout from '../components/Layout'
import { inicializarDatos } from '../data/seed'
import { iniciarSesion } from '../services/auth'

let copia = null

// Carga los datos de demostración en localStorage. La primera vez los genera (hash de
// contraseñas incluido) y guarda una copia; las siguientes solo restaura la copia.
export async function cargarDatosDemo() {
  if (!copia) {
    await inicializarDatos({ forzar: true })
    copia = Object.entries(localStorage)
  } else {
    localStorage.clear()
    copia.forEach(([k, v]) => localStorage.setItem(k, v))
  }
}

export const CUENTAS = {
  admin: ['admin@nutrivida.cl', 'Admin123'],
  secretaria: ['secretaria@nutrivida.cl', 'Secre123'],
  nutri: ['crojas@nutrivida.cl', 'Nutri123'],
  otroNutri: ['jpino@nutrivida.cl', 'Nutri123'],
  paciente: ['paciente@nutrivida.cl', 'Paciente123'],
}

export function iniciarComo(cuenta) {
  return iniciarSesion(...CUENTAS[cuenta])
}

// Lee una "tabla" directamente desde localStorage
export function tabla(nombre) {
  return JSON.parse(localStorage.getItem('nv_' + nombre) ?? '[]')
}

// Próximo día hábil a N días desde hoy, en formato YYYY-MM-DD
export function diaHabil(dias) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Espera a que terminen las animaciones de Bootstrap (modales) dentro de act(),
// para que React no avise de actualizaciones fuera de la prueba.
export async function esperarAnimaciones(ms = 400) {
  await act(() => new Promise((r) => setTimeout(r, ms)))
}

// Espera (reintentando) hasta que la condición sea verdadera. En Jasmine, expect() no lanza
// excepciones, por eso waitFor de Testing Library necesita una condición que sí lance.
export function hastaQue(condicion, mensaje = 'La condición no se cumplió a tiempo') {
  return waitFor(() => {
    if (!condicion()) throw new Error(mensaje)
  })
}

// Monta una vista dentro del layout real (barra superior + menú) con sesión y rutas en memoria.
// `extra` permite declarar rutas destino para comprobar navegaciones.
export function montarVista(elemento, { ruta = '/', path = '*', extra = [] } = {}) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/bienvenida" element={<p>PÁGINA DE BIENVENIDA</p>} />
          <Route path="/login" element={<p>PANTALLA LOGIN</p>} />
          {extra.map(([p, contenido]) => (
            <Route key={p} path={p} element={<p>{contenido}</p>} />
          ))}
          <Route element={<Layout />}>
            <Route path={path} element={elemento} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}
