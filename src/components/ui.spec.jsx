import { fireEvent, render, screen } from '@testing-library/react'
import { Alerta, Campo, EstadoCita, Modal, Segmentado, Stat } from './ui'
import { esperarAnimaciones } from '../test/ayudantes'

describe('components/ui', () => {
  describe('<Alerta>', () => {
    it('no renderiza nada si no recibe contenido', () => {
      const { container } = render(<Alerta>{''}</Alerta>)
      expect(container.innerHTML).toBe('')
    })

    it('aplica la clase de Bootstrap según el tipo y llama a onCerrar al cerrarla', () => {
      const onCerrar = jasmine.createSpy('onCerrar')
      render(
        <Alerta tipo="exito" onCerrar={onCerrar}>
          Guardado
        </Alerta>,
      )

      const alerta = screen.getByRole('status')
      expect(alerta.classList.contains('alert-success')).toBeTrue()
      fireEvent.click(screen.getByLabelText('Cerrar aviso'))
      expect(onCerrar).toHaveBeenCalledTimes(1)
    })
  })

  describe('<Campo>', () => {
    it('asocia la etiqueta al control y le agrega la clase form-control', () => {
      render(<Campo label="Correo">{(p) => <input {...p} type="email" />}</Campo>)

      const input = screen.getByLabelText('Correo')
      expect(input.tagName).toBe('INPUT')
      expect(input.classList.contains('form-control')).toBeTrue()
    })

    it('usa form-select para listas y muestra el error con is-invalid y aria-invalid', () => {
      render(
        <Campo label="Rol" error="Selecciona un rol.">
          {(p) => (
            <select {...p}>
              <option>Paciente</option>
            </select>
          )}
        </Campo>,
      )

      const select = screen.getByLabelText('Rol')
      expect(select.classList.contains('form-select')).toBeTrue()
      expect(select.classList.contains('is-invalid')).toBeTrue()
      expect(select.getAttribute('aria-invalid')).toBe('true')
      expect(screen.getByText('Selecciona un rol.').classList.contains('invalid-feedback')).toBeTrue()
    })

    it('muestra la ayuda solo cuando no hay error', () => {
      const { rerender } = render(
        <Campo label="Clave" ayuda="Mínimo 8 caracteres">
          {(p) => <input {...p} />}
        </Campo>,
      )
      expect(screen.queryByText('Mínimo 8 caracteres')).not.toBeNull()

      rerender(
        <Campo label="Clave" ayuda="Mínimo 8 caracteres" error="Muy corta">
          {(p) => <input {...p} />}
        </Campo>,
      )
      expect(screen.queryByText('Mínimo 8 caracteres')).toBeNull()
    })
  })

  describe('<EstadoCita>', () => {
    it('muestra el nombre del estado con el color de Bootstrap que corresponde', () => {
      const casos = [
        ['pendiente', 'Pendiente de confirmación', 'text-bg-warning'],
        ['confirmada', 'Confirmada', 'text-bg-primary'],
        ['atendida', 'Atendida', 'text-bg-success'],
        ['inasistencia', 'Inasistencia', 'text-bg-danger'],
      ]
      casos.forEach(([estado, texto, clase]) => {
        const { unmount } = render(<EstadoCita estado={estado} />)
        expect(screen.getByText(texto).classList.contains(clase)).toBeTrue()
        unmount()
      })
    })

    it('prioriza el aviso de reprogramación', () => {
      render(<EstadoCita estado="pendiente" requiereReprogramacion />)
      expect(screen.getByText('Requiere reprogramación')).toBeTruthy()
    })
  })

  describe('<Segmentado>', () => {
    it('marca la opción activa y notifica la elegida mediante la prop onChange', () => {
      const onChange = jasmine.createSpy('onChange')
      render(<Segmentado etiqueta="Indicador" valor="peso" onChange={onChange} opciones={[['peso', 'Peso'], ['imc', 'IMC']]} />)

      expect(screen.getByText('Peso').classList.contains('active')).toBeTrue()
      expect(screen.getByText('IMC').getAttribute('aria-pressed')).toBe('false')
      fireEvent.click(screen.getByText('IMC'))
      expect(onChange).toHaveBeenCalledOnceWith('imc')
    })
  })

  it('<Stat> muestra etiqueta, valor y detalle recibidos por props', () => {
    render(<Stat etiqueta="Peso" valor="88.4 kg" detalle="-7.6 kg desde el inicio" />)
    expect(screen.getByText('Peso')).toBeTruthy()
    expect(screen.getByText('88.4 kg').classList.contains('fw-bold')).toBeTrue()
    expect(screen.getByText('-7.6 kg desde el inicio')).toBeTruthy()
  })

  it('<Modal> se muestra según la prop abierto y avisa al cerrarse', async () => {
    const onCerrar = jasmine.createSpy('onCerrar')
    const { rerender } = render(
      <Modal titulo="Solicitar cita" abierto={false} onCerrar={onCerrar}>
        contenido
      </Modal>,
    )
    expect(screen.queryByText('Solicitar cita')).toBeNull()

    rerender(
      <Modal titulo="Solicitar cita" abierto onCerrar={onCerrar}>
        contenido
      </Modal>,
    )
    expect(await screen.findByText('Solicitar cita')).toBeTruthy()
    await esperarAnimaciones()
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onCerrar).toHaveBeenCalled()
    await esperarAnimaciones()
  })
})
