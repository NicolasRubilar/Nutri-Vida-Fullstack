import { fireEvent, screen } from '@testing-library/react'
import Agenda from './Agenda'
import Pacientes from './Pacientes'
import PacienteDetalle from './PacienteDetalle'
import Inicio from '../Inicio'
import { cargarDatosDemo, esperarAnimaciones, hastaQue, iniciarComo, montarVista, tabla } from '../../test/ayudantes'

const idPaciente = (email) => {
  const u = tabla('usuarios').find((x) => x.email === email)
  return tabla('pacientes').find((p) => p.usuarioId === u.id).id
}

describe('Vistas de la secretaria', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
    await iniciarComo('secretaria')
  })

  it('Inicio resume citas de hoy y solicitudes pendientes', async () => {
    montarVista(<Inicio />)
    expect(await screen.findByText('Solicitudes pendientes')).toBeTruthy()
    expect(screen.getByText('Solicitudes por confirmar')).toBeTruthy()
  })

  it('Agenda: confirma una solicitud pendiente con un clic', async () => {
    montarVista(<Agenda />, { ruta: '/agenda?estado=pendiente' })

    const confirmar = await screen.findAllByRole('button', { name: 'Confirmar' })
    const pendientesAntes = tabla('citas').filter((c) => c.estado === 'pendiente').length
    fireEvent.click(confirmar[0])

    expect(await screen.findByText('Cita confirmada y paciente notificado.')).toBeTruthy()
    expect(tabla('citas').filter((c) => c.estado === 'pendiente').length).toBe(pendientesAntes - 1)
  })

  it('Agenda: los filtros cambian el rango y el nutricionista mostrado', async () => {
    montarVista(<Agenda />, { ruta: '/agenda' })

    const filtroNutri = await screen.findByLabelText('Nutricionista')
    await hastaQue(() => filtroNutri.options.length > 1)
    const javiera = [...filtroNutri.options].find((o) => o.text === 'Javiera Pino').value
    fireEvent.change(filtroNutri, { target: { value: javiera } })
    fireEvent.click(screen.getByRole('button', { name: 'Últimos 30 días' }))

    await hastaQue(() => document.querySelectorAll('.list-group-item').length > 0)
    const textos = [...document.querySelectorAll('.list-group-item')].map((li) => li.textContent)
    expect(textos.every((t) => t.includes('Javiera Pino'))).toBeTrue()
  })

  it('Agenda: registrar la ausencia de un nutricionista notifica a sus pacientes', async () => {
    montarVista(<Agenda />, { ruta: '/agenda' })

    fireEvent.click(await screen.findByRole('button', { name: /Registrar ausencia/ }))
    const select = await screen.findByLabelText('Nutricionista', { selector: '.modal select' })
    fireEvent.change(select, { target: { value: select.options[1].value } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar y notificar' }))

    expect(await screen.findByText(/notificados para reprogramar|No había citas ese día/)).toBeTruthy()
    await esperarAnimaciones()
  })

  it('Pacientes: busca por nombre y oculta los datos clínicos a la secretaria', async () => {
    montarVista(<Pacientes />, { ruta: '/pacientes' })

    expect(await screen.findByText('8 paciente(s)')).toBeTruthy()
    expect(screen.queryByText('Último peso')).toBeNull()
    expect(screen.queryByText('Ver ficha')).toBeNull()
    fireEvent.change(screen.getByLabelText('Buscar paciente'), { target: { value: 'pedro' } })
    expect(screen.getByText('1 paciente(s)')).toBeTruthy()
  })

  it('Pacientes: reasigna el nutricionista de un paciente', async () => {
    montarVista(<Pacientes />, { ruta: '/pacientes' })
    const pedro = idPaciente('paciente@nutrivida.cl')

    fireEvent.change(await screen.findByLabelText('Buscar paciente'), { target: { value: 'Pedro' } })
    fireEvent.click(screen.getByRole('button', { name: 'Asignar nutricionista' }))
    const select = await screen.findByLabelText('Nutricionista')
    await hastaQue(() => select.options.length > 1)
    const tomas = [...select.options].find((o) => o.text.startsWith('Tomás')).value
    fireEvent.change(select, { target: { value: tomas } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText(/quedó asignado/)).toBeTruthy()
    expect(tabla('pacientes').find((p) => p.id === pedro).nutricionistaId).toBe(tomas)
    await esperarAnimaciones()
  })
})

describe('Vistas del nutricionista', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
    await iniciarComo('nutri')
  })

  it('Mi agenda no ofrece filtrar por otros nutricionistas', async () => {
    montarVista(<Agenda />, { ruta: '/agenda' })
    expect(await screen.findByText('Mi agenda')).toBeTruthy()
    expect(screen.queryByLabelText('Nutricionista')).toBeNull()
  })

  it('Ficha: registra una medición nueva validando los datos', async () => {
    const id = idPaciente('paciente@nutrivida.cl')
    montarVista(<PacienteDetalle />, { ruta: `/pacientes/${id}?tab=mediciones`, path: '/pacientes/:id' })
    const antes = tabla('mediciones').length

    fireEvent.click(await screen.findByRole('button', { name: /Registrar medición/ }))
    fireEvent.change(await screen.findByLabelText('Peso (kg)'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Peso entre 20 y 350 kg.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Peso (kg)'), { target: { value: '87.9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText(/Medición registrada/)).toBeTruthy()
    expect(tabla('mediciones').length).toBe(antes + 1)
    await esperarAnimaciones()
  })

  it('Ficha: edita la ficha clínica y crea un nuevo plan alimenticio', async () => {
    const id = idPaciente('paciente@nutrivida.cl')
    montarVista(<PacienteDetalle />, { ruta: `/pacientes/${id}?tab=ficha`, path: '/pacientes/:id' })

    fireEvent.click(await screen.findByRole('button', { name: /Editar/ }))
    fireEvent.change(screen.getByLabelText('Alergias e intolerancias'), { target: { value: 'Gluten' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ficha' }))
    expect(await screen.findByText('Ficha clínica guardada.')).toBeTruthy()
    expect(tabla('fichas').find((f) => f.pacienteId === id).alergias).toBe('Gluten')

    fireEvent.click(screen.getByRole('tab', { name: 'Plan alimenticio' }))
    fireEvent.click(await screen.findByRole('button', { name: /Nuevo plan/ }))
    fireEvent.change(await screen.findByLabelText('Objetivo'), { target: { value: 'Mantención' } })
    fireEvent.change(screen.getByLabelText('Almuerzo'), { target: { value: 'Pescado y ensalada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar plan' }))
    expect(await screen.findByText(/Nuevo plan asignado/)).toBeTruthy()
    await esperarAnimaciones()
  })

  it('Ficha: muestra el error 403 al intentar abrir un paciente de otro nutricionista', async () => {
    const ajeno = idPaciente('mriquelme@correo.cl')
    montarVista(<PacienteDetalle />, { ruta: `/pacientes/${ajeno}`, path: '/pacientes/:id' })

    expect(await screen.findByText('No tienes acceso a los datos clínicos de este paciente.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver a pacientes' })).toBeTruthy()
  })

  it('Ficha: la pestaña de citas lista el historial del paciente', async () => {
    const id = idPaciente('paciente@nutrivida.cl')
    montarVista(<PacienteDetalle />, { ruta: `/pacientes/${id}?tab=citas`, path: '/pacientes/:id' })
    expect(await screen.findByText('Historial de citas')).toBeTruthy()
    expect(screen.getAllByText('Atendida').length).toBeGreaterThan(0)
  })
})
