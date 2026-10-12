import * as api from './api'
import { cerrarSesion } from './auth'
import { cargarDatosDemo, diaHabil, iniciarComo, tabla } from '../test/ayudantes'
import { hoyISO } from '../utils/formato'

// Ids útiles de los datos de demostración
function ids() {
  const usuarios = tabla('usuarios')
  const porEmail = (e) => usuarios.find((u) => u.email === e).id
  const nutri = (e) => tabla('nutricionistas').find((n) => n.usuarioId === porEmail(e)).id
  const paciente = (e) => tabla('pacientes').find((p) => p.usuarioId === porEmail(e)).id
  return {
    camila: nutri('crojas@nutrivida.cl'),
    javiera: nutri('jpino@nutrivida.cl'),
    pedro: paciente('paciente@nutrivida.cl'), // asignado a Camila
    matias: paciente('mriquelme@correo.cl'), // asignado a Javiera
    adminId: porEmail('admin@nutrivida.cl'),
  }
}

describe('services/api: reglas de negocio', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
  })

  describe('privacidad de datos clínicos', () => {
    it('el nutricionista solo lista a sus pacientes asignados', async () => {
      await iniciarComo('nutri')
      const pacientes = await api.listarPacientes()

      expect(pacientes.map((p) => p.nombre).sort()).toEqual(['Pedro Sandoval', 'Valentina Lagos'])
    })

    it('el nutricionista no puede ver la ficha ni las mediciones de un paciente ajeno (403)', async () => {
      const { matias } = ids()
      await iniciarComo('nutri')

      const e1 = await api.obtenerFicha(matias).catch((e) => e)
      const e2 = await api.listarMediciones(matias).catch((e) => e)
      expect(e1.status).toBe(403)
      expect(e2.status).toBe(403)
    })

    it('la secretaria gestiona pacientes pero no recibe datos clínicos', async () => {
      const { pedro } = ids()
      await iniciarComo('secretaria')

      const pacientes = await api.listarPacientes()
      expect(pacientes.length).toBe(8)
      expect(pacientes.every((p) => p.ultimaMedicion === null)).toBeTrue()
      expect((await api.obtenerFicha(pedro).catch((e) => e)).status).toBe(403)
    })

    it('el paciente solo ve sus propias citas', async () => {
      const { pedro } = ids()
      await iniciarComo('paciente')
      const citas = await api.listarCitas()

      expect(citas.length).toBeGreaterThan(0)
      expect(citas.every((c) => c.pacienteId === pedro)).toBeTrue()
    })

    it('sin sesión ningún servicio responde (401)', async () => {
      cerrarSesion()
      expect((await api.listarCitas().catch((e) => e)).status).toBe(401)
    })
  })

  describe('flujo de solicitud de citas', () => {
    it('paciente solicita → secretaria confirma → paciente es notificado', async () => {
      const { camila } = ids()
      const fecha = diaHabil(20)

      await iniciarComo('paciente')
      const solicitada = await api.solicitarCita({ nutricionistaId: camila, fecha, hora: '10:00', motivo: 'Control de seguimiento' })
      expect(solicitada.estado).toBe('pendiente')

      cerrarSesion()
      await iniciarComo('secretaria')
      const confirmada = await api.confirmarCita(solicitada.id)
      expect(confirmada.estado).toBe('confirmada')
      expect(await api.horariosDisponibles(camila, fecha)).not.toContain('10:00')

      cerrarSesion()
      await iniciarComo('paciente')
      const notificaciones = await api.misNotificaciones()
      expect(notificaciones.some((n) => n.titulo === 'Cita confirmada')).toBeTrue()
      const historial = await api.historialCita(solicitada.id)
      expect(historial.map((h) => h.estado)).toEqual(['pendiente', 'confirmada'])
    })

    it('rechaza horarios ocupados y fines de semana (422)', async () => {
      const { camila } = ids()
      const fecha = diaHabil(21)
      await iniciarComo('paciente')
      await api.solicitarCita({ nutricionistaId: camila, fecha, hora: '11:00', motivo: 'Otro' })

      const ocupado = await api.solicitarCita({ nutricionistaId: camila, fecha, hora: '11:00', motivo: 'Otro' }).catch((e) => e)
      expect(ocupado.status).toBe(422)
      expect(ocupado.campos.hora).toContain('no está disponible')

      const sabado = new Date()
      sabado.setDate(sabado.getDate() + ((6 - sabado.getDay() + 7) % 7 || 7))
      const iso = `${sabado.getFullYear()}-${String(sabado.getMonth() + 1).padStart(2, '0')}-${String(sabado.getDate()).padStart(2, '0')}`
      const finde = await api.solicitarCita({ nutricionistaId: camila, fecha: iso, hora: '10:00', motivo: 'Otro' }).catch((e) => e)
      expect(finde.campos.fecha).toContain('lunes a viernes')
    })

    it('el paciente cancela su cita y no puede cancelarla dos veces (409)', async () => {
      await iniciarComo('paciente')
      const cita = (await api.listarCitas()).find((c) => c.estado === 'confirmada')

      expect((await api.cancelarCita(cita.id, 'Viaje')).estado).toBe('cancelada')
      expect((await api.cancelarCita(cita.id).catch((e) => e)).status).toBe(409)
    })

    it('al reprogramar, el paciente deja la cita pendiente de confirmación', async () => {
      await iniciarComo('paciente')
      const cita = (await api.listarCitas()).find((c) => c.estado === 'confirmada')
      const nueva = await api.reprogramarCita(cita.id, { fecha: diaHabil(25), hora: '16:00' })

      expect(nueva.estado).toBe('pendiente')
      expect(nueva.hora).toBe('16:00')
    })

    it('registrar la ausencia de un nutricionista marca sus citas del día y avisa a cada paciente', async () => {
      const { camila } = ids()
      const cita = tabla('citas').find((c) => c.nutricionistaId === camila && c.estado === 'confirmada' && c.fecha >= diaHabil(0))
      await iniciarComo('secretaria')

      const afectadas = await api.registrarAusencia(camila, cita.fecha)
      const actualizada = tabla('citas').find((c) => c.id === cita.id)
      expect(afectadas).toBeGreaterThanOrEqual(1)
      expect(actualizada.requiereReprogramacion).toBeTrue()
      expect(tabla('notificaciones').some((n) => n.titulo === 'Tu cita debe reprogramarse')).toBeTrue()
    })
  })

  describe('ficha clínica, mediciones y planes', () => {
    it('valida los rangos de una medición (422) y la guarda cuando es correcta', async () => {
      const { pedro } = ids()
      await iniciarComo('nutri')

      const error = await api.registrarMedicion(pedro, { fecha: hoyISO(), peso: 900, talla: 176 }).catch((e) => e)
      expect(error.status).toBe(422)
      expect(error.campos.peso).toBeDefined()

      const antes = (await api.listarMediciones(pedro)).length
      await api.registrarMedicion(pedro, { fecha: hoyISO(), peso: 87.5, talla: 176, cintura: 96 })
      expect((await api.listarMediciones(pedro)).length).toBe(antes + 1)
    })

    it('un plan nuevo reemplaza al vigente y el anterior queda en el historial', async () => {
      const { pedro } = ids()
      await iniciarComo('nutri')
      await api.guardarPlan(pedro, { objetivo: 'Mantención', calorias: 2000, almuerzo: 'Legumbres con ensalada' })

      const planes = await api.listarPlanes(pedro)
      expect(planes.filter((p) => p.vigente).length).toBe(1)
      expect(planes.find((p) => p.vigente).objetivo).toBe('Mantención')
      expect(planes.length).toBe(2)
    })
  })

  describe('administración y reportes', () => {
    it('solo el administrador obtiene estadísticas; la tasa de inasistencia es coherente', async () => {
      await iniciarComo('nutri')
      expect((await api.estadisticas({}).catch((e) => e)).status).toBe(403)

      cerrarSesion()
      await iniciarComo('admin')
      const s = await api.estadisticas({})
      const atendidas = s.porEstado.find((e) => e.estado === 'atendida').cantidad
      const faltas = s.porEstado.find((e) => e.estado === 'inasistencia').cantidad
      expect(s.tasaInasistencia).toBeCloseTo(faltas / (atendidas + faltas), 5)
      expect(s.porNutricionista.length).toBe(4)
    })

    it('el administrador crea usuarios con rol y no puede desactivarse a sí mismo', async () => {
      const { adminId } = ids()
      await iniciarComo('admin')

      const nuevo = await api.crearUsuario({
        nombre: 'Rosa',
        apellido: 'Toro',
        rut: '10.000.013-K',
        email: 'rtoro@nutrivida.cl',
        rol: 'nutricionista',
        especialidad: 'Pérdida de peso',
        password: 'Nutri2026',
      })
      expect(nuevo.rol).toBe('nutricionista')
      expect((await api.listarNutricionistas()).some((n) => n.nombre === 'Rosa Toro')).toBeTrue()
      expect((await api.cambiarEstadoUsuario(adminId, false).catch((e) => e)).status).toBe(409)
    })

    it('equipoPublico no requiere sesión y no expone datos sensibles', async () => {
      cerrarSesion()
      const equipo = await api.equipoPublico()

      expect(equipo.length).toBe(4)
      expect(Object.keys(equipo[0]).sort()).toEqual(['especialidad', 'id', 'nombre'])
    })
  })
})
