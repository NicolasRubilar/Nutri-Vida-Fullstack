import { fireEvent, render, screen } from '@testing-library/react'
import { GraficoBarras, GraficoColumnas, GraficoLinea } from './Graficos'
import Buscador from './Buscador'

describe('components/Graficos', () => {
  it('<GraficoBarras> dibuja cada barra proporcional al valor máximo', () => {
    const { container } = render(
      <GraficoBarras
        datos={[
          { etiqueta: 'Camila', valor: 20 },
          { etiqueta: 'Felipe', valor: 10 },
        ]}
      />,
    )

    const rellenos = container.querySelectorAll('.barra-relleno')
    expect(rellenos.length).toBe(2)
    expect(rellenos[0].style.width).toBe('100%')
    expect(rellenos[1].style.width).toBe('50%')
    expect(screen.getByText('Felipe')).toBeTruthy()
  })

  it('<GraficoLinea> dibuja un punto por medición y etiqueta el último valor', () => {
    const datos = [
      { x: '2026-08-01', y: 90 },
      { x: '2026-08-15', y: 89.2 },
      { x: '2026-09-01', y: 88.4 },
    ]
    const { container } = render(<GraficoLinea datos={datos} unidad="kg" titulo="Peso" />)

    expect(container.querySelectorAll('circle').length).toBe(3)
    expect(container.querySelector('.grafico-etiqueta').textContent).toBe('88,4 kg')
    expect(container.querySelector('svg').getAttribute('aria-label')).toBe('Peso')
  })

  it('<GraficoLinea> muestra un tooltip al pasar el cursor', () => {
    const { container } = render(<GraficoLinea datos={[{ x: 'a', y: 1 }, { x: 'b', y: 2 }]} unidad="kg" />)
    const svg = container.querySelector('svg')
    const r = svg.getBoundingClientRect()

    fireEvent.pointerMove(svg, { clientX: r.left + 5, clientY: r.top + 20 })
    expect(container.querySelector('.grafico-tooltip')).not.toBeNull()
    fireEvent.pointerLeave(svg)
    expect(container.querySelector('.grafico-tooltip')).toBeNull()
  })

  it('<GraficoColumnas> muestra la leyenda con cada serie', () => {
    render(
      <GraficoColumnas
        datos={[{ x: '2026-09', atendidas: 12, inasistencias: 3 }]}
        series={[
          { clave: 'atendidas', nombre: 'Atendidas', color: 'blue' },
          { clave: 'inasistencias', nombre: 'Inasistencias', color: 'orange' },
        ]}
      />,
    )
    expect(screen.getByText('Atendidas')).toBeTruthy()
    expect(screen.getByText('Inasistencias')).toBeTruthy()
  })
})

describe('components/Buscador', () => {
  it('envía lo escrito al componente padre mediante la prop onChange', () => {
    const onChange = jasmine.createSpy('onChange')
    render(<Buscador valor="" onChange={onChange} placeholder="Buscar" etiqueta="Buscar paciente" />)

    fireEvent.change(screen.getByLabelText('Buscar paciente'), { target: { value: 'Pedro' } })
    expect(onChange).toHaveBeenCalledWith('Pedro')
  })
})
