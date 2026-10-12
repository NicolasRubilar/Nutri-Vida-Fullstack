import { fireEvent, render, screen } from '@testing-library/react'
import { TablaMediciones, VistaPlan } from './Clinico'

const MEDICIONES = [
  { id: 'm1', fecha: '2026-08-01', peso: 96, talla: 176, cintura: 104, grasa: 31, notas: 'Evaluación inicial' },
  { id: 'm2', fecha: '2026-09-01', peso: 90, talla: 176, cintura: null, grasa: null, notas: '' },
]

describe('components/Clinico', () => {
  it('<TablaMediciones> calcula el IMC y muestra la medición más reciente primero', () => {
    render(<TablaMediciones mediciones={MEDICIONES} />)

    const filas = screen.getAllByRole('row').slice(1) // sin encabezado
    expect(filas[0].textContent).toContain('90')
    expect(filas[0].textContent).toContain('29.1') // IMC calculado 90 / 1.76²
    expect(filas[1].textContent).toContain('Evaluación inicial')
    expect(screen.queryByText('Editar')).toBeNull() // sin acciones para el paciente
  })

  it('<TablaMediciones> llama a onEditar y onEliminar con la medición elegida', () => {
    const onEditar = jasmine.createSpy('onEditar')
    const onEliminar = jasmine.createSpy('onEliminar')
    render(<TablaMediciones mediciones={MEDICIONES} onEditar={onEditar} onEliminar={onEliminar} />)

    fireEvent.click(screen.getAllByText('Editar')[0])
    fireEvent.click(screen.getAllByText('Eliminar')[1])
    expect(onEditar).toHaveBeenCalledWith(MEDICIONES[1])
    expect(onEliminar).toHaveBeenCalledWith(MEDICIONES[0])
  })

  it('<TablaMediciones> muestra un mensaje cuando no hay datos', () => {
    render(<TablaMediciones mediciones={[]} />)
    expect(screen.getByText('Sin mediciones registradas')).toBeTruthy()
  })

  it('<VistaPlan> muestra solo las comidas indicadas y las calorías con formato chileno', () => {
    render(
      <VistaPlan
        plan={{ objetivo: 'Déficit moderado', calorias: 1900, desayuno: 'Avena', almuerzo: 'Legumbres', cena: '', indicaciones: 'Tomar agua', nutricionista: 'Camila Rojas', fecha: '2026-09-20' }}
      />,
    )

    expect(screen.getByText('1.900')).toBeTruthy()
    expect(screen.getByText('Desayuno')).toBeTruthy()
    expect(screen.queryByText('Cena')).toBeNull()
    expect(screen.getByText('Tomar agua')).toBeTruthy()
    expect(screen.getByText(/Indicado por Camila Rojas/)).toBeTruthy()
  })
})
