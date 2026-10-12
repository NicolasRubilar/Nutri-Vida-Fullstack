// Datos de demostración. Se cargan en localStorage la primera vez que se abre la app.
import { db } from '../services/db'
import { crearCredenciales } from '../services/auth'
import { generarRecordatorios } from '../services/api'
import { ESTADOS_CITA, HORARIOS, MOTIVOS_CONSULTA, ROLES } from '../utils/constantes'
import { esFinDeSemana, hoyISO, sumarDias } from '../utils/formato'

const VERSION = '1'

export const CUENTAS_DEMO = [
  { rol: 'Administrador', email: 'admin@nutrivida.cl', password: 'Admin123' },
  { rol: 'Secretaria', email: 'secretaria@nutrivida.cl', password: 'Secre123' },
  { rol: 'Nutricionista', email: 'crojas@nutrivida.cl', password: 'Nutri123' },
  { rol: 'Paciente', email: 'paciente@nutrivida.cl', password: 'Paciente123' },
]

function rutConDv(cuerpo) {
  let suma = 0
  let mult = 2
  const s = String(cuerpo)
  for (let i = s.length - 1; i >= 0; i--) {
    suma += Number(s[i]) * mult
    mult = mult === 7 ? 2 : mult + 1
  }
  const r = 11 - (suma % 11)
  return s + (r === 11 ? '0' : r === 10 ? 'K' : String(r))
}

// Generador pseudoaleatorio determinista para que la demo sea siempre igual
function aleatorio(semilla) {
  let s = semilla
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function diaHabil(iso, haciaAtras = false) {
  let f = iso
  while (esFinDeSemana(f)) f = sumarDias(f, haciaAtras ? -1 : 1)
  return f
}

const STAFF = [
  { nombre: 'Andrea', apellido: 'Fuentes', email: 'admin@nutrivida.cl', password: 'Admin123', rol: ROLES.ADMIN, rut: 12345678 },
  { nombre: 'Marcela', apellido: 'Soto', email: 'secretaria@nutrivida.cl', password: 'Secre123', rol: ROLES.SECRETARIA, rut: 13456789 },
  { nombre: 'Camila', apellido: 'Rojas', email: 'crojas@nutrivida.cl', password: 'Nutri123', rol: ROLES.NUTRICIONISTA, rut: 15234567, especialidad: 'Pérdida de peso' },
  { nombre: 'Felipe', apellido: 'Contreras', email: 'fcontreras@nutrivida.cl', password: 'Nutri123', rol: ROLES.NUTRICIONISTA, rut: 14345678, especialidad: 'Enfermedades metabólicas' },
  { nombre: 'Javiera', apellido: 'Pino', email: 'jpino@nutrivida.cl', password: 'Nutri123', rol: ROLES.NUTRICIONISTA, rut: 16456789, especialidad: 'Nutrición deportiva' },
  { nombre: 'Tomás', apellido: 'Navarrete', email: 'tnavarrete@nutrivida.cl', password: 'Nutri123', rol: ROLES.NUTRICIONISTA, rut: 17567890, especialidad: 'Alimentación vegetariana y vegana' },
]

// nutri = índice dentro de los nutricionistas (0..3); delta = kg por control
const PACIENTES = [
  { nombre: 'Pedro', apellido: 'Sandoval', email: 'paciente@nutrivida.cl', rut: 18234567, nac: '1988-04-12', sexo: 'M', nutri: 0, peso: 96, talla: 176, delta: -0.9, cintura: 104, grasa: 31 },
  { nombre: 'Valentina', apellido: 'Lagos', email: 'vlagos@correo.cl', rut: 19345678, nac: '1995-09-03', sexo: 'F', nutri: 0, peso: 78, talla: 162, delta: -0.6, cintura: 90, grasa: 34 },
  { nombre: 'Diego', apellido: 'Huenchumilla', email: 'dhuenchumilla@correo.cl', rut: 16789012, nac: '1979-01-25', sexo: 'M', nutri: 1, peso: 88, talla: 170, delta: -0.4, cintura: 101, grasa: 29 },
  { nombre: 'Sofía', apellido: 'Carrasco', email: 'scarrasco@correo.cl', rut: 15678901, nac: '1970-06-30', sexo: 'F', nutri: 1, peso: 74, talla: 158, delta: -0.3, cintura: 93, grasa: 36 },
  { nombre: 'Matías', apellido: 'Riquelme', email: 'mriquelme@correo.cl', rut: 20123456, nac: '2000-11-08', sexo: 'M', nutri: 2, peso: 71, talla: 180, delta: 0.4, cintura: 79, grasa: 14 },
  { nombre: 'Fernanda', apellido: 'Paillalef', email: 'fpaillalef@correo.cl', rut: 19876543, nac: '1998-02-17', sexo: 'F', nutri: 2, peso: 60, talla: 167, delta: 0.2, cintura: 70, grasa: 22 },
  { nombre: 'Ignacio', apellido: 'Vera', email: 'ivera@correo.cl', rut: 18765432, nac: '1992-07-21', sexo: 'M', nutri: 3, peso: 82, talla: 174, delta: -0.5, cintura: 92, grasa: 25 },
  { nombre: 'Daniela', apellido: 'Ortiz', email: 'dortiz@correo.cl', rut: 17654321, nac: '1985-12-02', sexo: 'F', nutri: 3, peso: 66, talla: 164, delta: -0.2, cintura: 81, grasa: 28 },
]

const FICHAS = [
  { diagnostico: 'Obesidad grado I. Resistencia a la insulina.', antecedentes: 'Padre con diabetes tipo 2. Sedentario.', alergias: 'Ninguna conocida', medicamentos: 'Metformina 850 mg', objetivo: 'Bajar 10 kg en 6 meses' },
  { diagnostico: 'Sobrepeso. Ingesta elevada de ultraprocesados.', antecedentes: 'Trabajo en turnos.', alergias: 'Lactosa (intolerancia)', medicamentos: '—', objetivo: 'Mejorar hábitos y bajar 6 kg' },
  { diagnostico: 'Diabetes mellitus tipo 2. Dislipidemia.', antecedentes: 'HbA1c 7,8 %', alergias: 'Ninguna', medicamentos: 'Metformina, atorvastatina', objetivo: 'Control glicémico, HbA1c < 7 %' },
  { diagnostico: 'Hipotiroidismo. Sobrepeso.', antecedentes: 'Menopausia', alergias: 'Mariscos', medicamentos: 'Levotiroxina 75 mcg', objetivo: 'Bajar perímetro de cintura' },
  { diagnostico: 'Deportista (triatlón). Normopeso.', antecedentes: 'Entrena 12 h/semana', alergias: 'Ninguna', medicamentos: '—', objetivo: 'Aumentar masa muscular' },
  { diagnostico: 'Deportista (atletismo). Normopeso.', antecedentes: 'Anemia ferropénica previa', alergias: 'Ninguna', medicamentos: 'Sulfato ferroso', objetivo: 'Optimizar rendimiento y hierro' },
  { diagnostico: 'Transición a alimentación vegana. Sobrepeso leve.', antecedentes: '—', alergias: 'Maní', medicamentos: 'Vitamina B12', objetivo: 'Dieta vegana equilibrada' },
  { diagnostico: 'Vegetariana ovolacto. Déficit de B12.', antecedentes: 'Hipotensión ocasional', alergias: 'Ninguna', medicamentos: 'B12 sublingual', objetivo: 'Corregir déficit y mantener peso' },
]

const PLANES = [
  { objetivo: 'Déficit calórico moderado', calorias: 1900, desayuno: 'Pan integral (1 un.) con palta y huevo. Té o café sin azúcar.', colacionAm: '1 fruta + 10 almendras', almuerzo: 'Ensalada libre + 120 g pollo o pescado + ½ taza de arroz integral o legumbres.', colacionPm: 'Yogur natural descremado', cena: 'Verduras salteadas + 2 huevos o 100 g de pavo.', indicaciones: 'Tomar 2 litros de agua. Caminar 30 min diarios. Evitar bebidas azucaradas.' },
  { objetivo: 'Reeducación alimentaria', calorias: 1600, desayuno: 'Avena con bebida vegetal y fruta picada.', colacionAm: 'Pepino o zanahoria en bastones', almuerzo: 'Legumbres 1 taza + ensalada + fruta de postre.', colacionPm: 'Yogur sin lactosa', cena: 'Sopa de verduras + tortilla de espinaca.', indicaciones: 'Planificar colaciones para los turnos. Leer etiquetado.' },
  { objetivo: 'Control glicémico', calorias: 1800, desayuno: 'Pan integral con quesillo y tomate.', colacionAm: '1 manzana', almuerzo: 'Pescado al horno + verduras + ½ taza de quínoa.', colacionPm: '10 nueces', cena: 'Ensalada completa + pollo a la plancha.', indicaciones: 'Distribuir carbohidratos en el día. Controlar glicemia en ayunas.' },
  { objetivo: 'Reducir perímetro de cintura', calorias: 1500, desayuno: 'Yogur con avena y frutos rojos.', colacionAm: 'Té + 2 galletas de arroz', almuerzo: 'Carne magra + puré de zapallo + ensalada.', colacionPm: '1 pera', cena: 'Crema de verduras + huevo duro.', indicaciones: 'Evitar mariscos. Actividad física 3 veces por semana.' },
  { objetivo: 'Superávit para hipertrofia', calorias: 3200, desayuno: 'Avena 80 g + plátano + 3 huevos.', colacionAm: 'Sándwich de pavo y palta', almuerzo: 'Arroz 1½ taza + 180 g carne + ensalada.', colacionPm: 'Batido de leche, plátano y avena', cena: 'Pasta integral + atún + verduras.', indicaciones: 'Proteína post entrenamiento dentro de 1 hora. Hidratación con electrolitos en sesiones largas.' },
  { objetivo: 'Rendimiento y hierro', calorias: 2600, desayuno: 'Pan integral con huevo + jugo natural (vitamina C).', colacionAm: 'Frutos secos + fruta', almuerzo: 'Lentejas con arroz + carne roja magra 2 veces por semana.', colacionPm: 'Yogur con granola', cena: 'Pollo + papas cocidas + espinaca.', indicaciones: 'No tomar té ni café junto a comidas ricas en hierro.' },
  { objetivo: 'Dieta vegana equilibrada', calorias: 2100, desayuno: 'Tostadas con hummus y tomate + bebida vegetal fortificada.', colacionAm: 'Fruta + semillas de zapallo', almuerzo: 'Tofu salteado + quínoa + verduras.', colacionPm: 'Barrita de avena casera (sin maní)', cena: 'Garbanzos guisados + ensalada.', indicaciones: 'Suplementar B12 diaria. Evitar maní y derivados.' },
  { objetivo: 'Corregir déficit de B12', calorias: 1900, desayuno: 'Huevos revueltos + pan integral.', colacionAm: 'Leche o yogur', almuerzo: 'Lentejas + arroz + ensalada.', colacionPm: 'Queso fresco + fruta', cena: 'Tortilla de verduras + crema de zapallo.', indicaciones: 'Mantener B12 sublingual. Aumentar sal levemente por hipotensión.' },
]

export async function inicializarDatos({ forzar = false } = {}) {
  if (!forzar && db.meta('seed') === VERSION) return
  db.limpiarTodo()

  const rnd = aleatorio(42)
  const hoy = hoyISO()

  const nutris = []
  for (const s of STAFF) {
    const u = db.insertar('usuarios', {
      nombre: s.nombre,
      apellido: s.apellido,
      rut: rutConDv(s.rut),
      email: s.email,
      telefono: '+569 ' + String(s.rut).slice(0, 8),
      rol: s.rol,
      activo: true,
      creadoEn: Date.now(),
      ...(await crearCredenciales(s.password)),
    })
    if (s.rol === ROLES.NUTRICIONISTA) nutris.push(db.insertar('nutricionistas', { usuarioId: u.id, especialidad: s.especialidad }))
  }
  const secretaria = db.todos('usuarios').find((u) => u.rol === ROLES.SECRETARIA)

  for (const [i, p] of PACIENTES.entries()) {
    const u = db.insertar('usuarios', {
      nombre: p.nombre,
      apellido: p.apellido,
      rut: rutConDv(p.rut),
      email: p.email,
      telefono: '+569 ' + String(p.rut).slice(0, 8),
      rol: ROLES.PACIENTE,
      activo: true,
      creadoEn: Date.now(),
      ...(await crearCredenciales('Paciente123')),
    })
    const nutri = nutris[p.nutri]
    const paciente = db.insertar('pacientes', { usuarioId: u.id, fechaNacimiento: p.nac, sexo: p.sexo, nutricionistaId: nutri.id })
    db.insertar('fichas', { pacienteId: paciente.id, ...FICHAS[i], actualizadaEn: Date.now(), actualizadaPor: 'Carga inicial' })

    // Historial: controles cada ~15 días durante los últimos 6 meses
    let fecha = diaHabil(sumarDias(hoy, -180 + Math.floor(rnd() * 10)))
    let peso = p.peso
    let cintura = p.cintura
    let grasa = p.grasa
    let n = 0
    while (fecha < sumarDias(hoy, -3)) {
      const hora = HORARIOS[Math.floor(rnd() * HORARIOS.length)]
      const falta = n > 0 && rnd() < 0.2
      const estado = falta ? ESTADOS_CITA.INASISTENCIA : rnd() < 0.05 ? ESTADOS_CITA.CANCELADA : ESTADOS_CITA.ATENDIDA
      const motivo = n === 0 ? MOTIVOS_CONSULTA[0] : MOTIVOS_CONSULTA[1]
      const cita = db.insertar('citas', {
        pacienteId: paciente.id,
        nutricionistaId: nutri.id,
        fecha,
        hora,
        motivo,
        comentario: '',
        estado,
        creadaEn: Date.now(),
        recordatorioEnviado: true,
      })
      db.insertar('historialCitas', { citaId: cita.id, estado, usuarioId: secretaria.id, actor: 'Carga inicial', comentario: '', fecha: Date.now() })
      if (estado === ESTADOS_CITA.ATENDIDA) {
        db.insertar('mediciones', {
          pacienteId: paciente.id,
          nutricionistaId: nutri.id,
          fecha,
          peso: Math.round(peso * 10) / 10,
          talla: p.talla,
          cintura: Math.round(cintura * 10) / 10,
          grasa: Math.round(grasa * 10) / 10,
          notas: n === 0 ? 'Evaluación inicial' : '',
        })
        peso += p.delta + (rnd() - 0.5) * 0.6
        cintura += p.delta * 0.8 + (rnd() - 0.5) * 0.5
        grasa += (p.delta < 0 ? -0.3 : -0.1) + (rnd() - 0.5) * 0.3
      }
      n++
      fecha = diaHabil(sumarDias(fecha, 14 + Math.floor(rnd() * 5)))
    }

    db.insertar('planes', {
      pacienteId: paciente.id,
      nutricionistaId: nutri.id,
      fecha: sumarDias(hoy, -20),
      vigente: true,
      ...PLANES[i],
    })

    // Próxima cita: confirmada o pendiente
    const futura = diaHabil(sumarDias(hoy, i === 0 ? 1 : 2 + i))
    const estadoFuturo = i % 3 === 2 ? ESTADOS_CITA.PENDIENTE : ESTADOS_CITA.CONFIRMADA
    const cita = db.insertar('citas', {
      pacienteId: paciente.id,
      nutricionistaId: nutri.id,
      fecha: futura,
      hora: HORARIOS[(i * 3) % HORARIOS.length],
      motivo: MOTIVOS_CONSULTA[1],
      comentario: '',
      estado: estadoFuturo,
      creadaEn: Date.now(),
      recordatorioEnviado: false,
    })
    db.insertar('historialCitas', { citaId: cita.id, estado: ESTADOS_CITA.PENDIENTE, usuarioId: u.id, actor: `${p.nombre} ${p.apellido} (paciente)`, comentario: 'Solicitud creada por el paciente', fecha: Date.now() - 86_400_000 })
    if (estadoFuturo === ESTADOS_CITA.CONFIRMADA) {
      db.insertar('historialCitas', { citaId: cita.id, estado: estadoFuturo, usuarioId: secretaria.id, actor: 'Marcela Soto (secretaria)', comentario: 'Horario confirmado', fecha: Date.now() - 3_600_000 })
    }
  }

  db.meta('seed', VERSION)
  generarRecordatorios()
}
