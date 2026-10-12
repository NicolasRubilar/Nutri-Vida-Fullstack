import { fireEvent, screen } from '@testing-library/react'
import MisCitas from './MisCitas'
import MiProgreso from './MiProgreso'
import MiPlan from './MiPlan'
import Inicio from '../Inicio'
import { cargarDatosDemo, diaHabil, esperarAnimaciones, hastaQue, iniciarComo, montarVista, tabla } from '../../test/ayudantes'

describe('Vistas del paciente', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
    await iniciarComo('paciente')
  })

  it('Inicio muestra el recordatorio automático, sus indicadores y la próxima cita', async () => {
    montarVista(<Inicio />)

    expect(await screen.findByText('Recordatorio de cita.')).toBeTruthy()
    expect(screen.getByText('Peso actual')).toBeTruthy()
    expect(screen.getByText('Próxima cita')).toBeTruthy()
    expect(screen.getByText('Plan alimenticio vigente')).toBeTruthy()
  })

  it('Mis citas: solicita una cita completa desde el modal y la muestra como pendiente', async () => {
    montarVista(<MisCitas />, { ruta: '/mis-citas' })
    const antes = tabla('citas').length

    fireEvent.click(await screen.findByRole('button', { name: /Solicitar cita/ }))
    const motivo = await screen.findByLabelText('Motivo de la consulta')
    fireEvent.change(motivo, { target: { value: 'Control de seguimiento' } })
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: diaHabil(15) } })
    fireEvent.click(await screen.findByLabelText('16:00'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    expect(await screen.findByText(/Solicitud enviada/)).toBeTruthy()
    expect(tabla('citas').length).toBe(antes + 1)
    expect(tabla('citas').at(-1).estado).toBe('pendiente')
    await esperarAnimaciones()
  })

  it('Mis citas: muestra los errores de validación del servicio en el formulario', async () => {
    montarVista(<MisCitas />, { ruta: '/mis-citas?nueva=1' })

    fireEvent.click(await screen.findByRole('button', { name: 'Enviar solicitud' }))
    expect(await screen.findByText('Indica el motivo de la consulta.')).toBeTruthy()
    await esperarAnimaciones()
  })

  it('Mis citas: abre el detalle con el seguimiento de estados de la cita', async () => {
    montarVista(<MisCitas />, { ruta: '/mis-citas' })

    fireEvent.click((await screen.findAllByRole('button', { name: 'Detalle' }))[0])
    expect(await screen.findByText('Seguimiento')).toBeTruthy()
    await hastaQue(() => document.querySelectorAll('.linea-tiempo li').length >= 2)
    await esperarAnimaciones()
  })

  it('Mi progreso: muestra el historial y cambia de indicador en el gráfico', async () => {
    montarVista(<MiProgreso />, { ruta: '/progreso' })

    expect(await screen.findByText('Historial de mediciones')).toBeTruthy()
    expect(screen.getByText('Evolución de peso')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cintura' }))
    expect(screen.getByText('Evolución de cintura')).toBeTruthy()
  })

  it('Mi plan: muestra el plan vigente y permite imprimirlo (mock de window.print)', async () => {
    spyOn(window, 'print')
    montarVista(<MiPlan />, { ruta: '/plan' })

    expect(await screen.findByText('Déficit calórico moderado')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Imprimir/ }))
    expect(window.print).toHaveBeenCalledTimes(1)
  })
})
