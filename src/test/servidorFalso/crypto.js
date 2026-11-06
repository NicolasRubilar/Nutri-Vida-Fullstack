// Hash de contraseñas con PBKDF2-SHA256 (Web Crypto API) y sal aleatoria por usuario.
// Las contraseñas nunca se guardan en texto plano.

const ITERACIONES = 120_000

function aHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function deHex(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)))
}

export function generarSal() {
  return aHex(crypto.getRandomValues(new Uint8Array(16)))
}

export function generarToken() {
  return aHex(crypto.getRandomValues(new Uint8Array(32)))
}

export async function hashPassword(password, salHex) {
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deHex(salHex), iterations: ITERACIONES },
    clave,
    256,
  )
  return aHex(bits)
}

// Comparación en tiempo constante para no filtrar información por tiempos.
export function iguales(a, b) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
