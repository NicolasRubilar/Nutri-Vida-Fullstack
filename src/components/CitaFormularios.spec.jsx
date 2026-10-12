import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AccionesForm, ModalCancelarCita, SelectorHorario } from './CitaFormularios'
import * as api from '../services/api'
import { cargarDatosDemo, diaHabil, esperarAnimaciones, hastaQue, iniciarComo, tabla } from '../test/ayudantes'

function proximoSabado() {
  const d = new Date()
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('components/CitaFormularios', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
    await iniciarComo('paciente')
  })

  describe('<SelectorHorario>', () => {
    it('pide elegir nutricionista y fecha antes de mostrar horarios', () => {
      render(<SelectorHorario nutricionistaId="" fecha="" valor="" onChange={() => {}} />)
      expect(screen.getByText(/Elige nutricionista y fecha/)).toBeTruthy()
    })

    it('avisa que la clínica no atiende fines de semana', () => {
      render(<SelectorHorario nutricionistaId="x" fecha={proximoSabado()} valor="" onChange={() => {}} />)
      expect(screen.getByText('La clínica atiende de lunes a viernes.')).toBeTruthy()
    })

    it('muestra los bloques libres como botones y notifica el elegido', async () => {
      const nutri = tabla('nutricionistas')[0].id
      const onChange = jasmine.createSpy('onChange')
      render(<SelectorHorario nutricionistaId={nutri} fecha={diaHabil(30)} valor="" onChange={onChange} />)

      const bloque = await screen.findByLabelText('15:00')
      expect(bloque.classList.contains('btn-check')).toBeTrue()
      expect(screen.getAllByRole('radio').length).toBe(8)
      fireEvent.click(bloque)
      expect(onChange).toHaveBeenCalledOnceWith('15:00')
    })
  })

  describe('<AccionesForm>', () => {
    it('renderiza botones y ejecuta onCancelar usando mocks (spies)', () => {
      const spyCancelar = jasmine.createSpy('onCancelar')
      render(
        <AccionesForm onCancelar={spyCancelar} textoCancelar="Volver">
          <button>Confirmar</button>
        </AccionesForm>
      )
      
      expect(screen.getByText('Volver')).toBeTruthy()
      expect(screen.getByText('Confirmar')).toBeTruthy()
      
      fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
      expect(spyCancelar).toHaveBeenCalled()
    })
  })

  describe('<ModalCancelarCita>', () => {
    it('cancela la cita con el motivo indicado y avisa al padre con onListo', async () => {
      const cita = (await api.listarCitas()).find((c) => c.estado === 'confirmada')
      const onListo = jasmine.createSpy('onListo')
      render(<ModalCancelarCita cita={cita} onCerrar={() => {}} onListo={onListo} />)

      fireEvent.change(await screen.findByLabelText('Motivo (opcional)'), { target: { value: 'Viaje' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar cita' }))

      await hastaQue(() => onListo.calls.any())
      expect(onListo).toHaveBeenCalledWith('Cita cancelada.')
      const guardada = tabla('citas').find((c) => c.id === cita.id)
      expect(guardada.estado).toBe('cancelada')
      expect(guardada.motivoCancelacion).toBe('Viaje')
      await esperarAnimaciones()
    })
  })
})