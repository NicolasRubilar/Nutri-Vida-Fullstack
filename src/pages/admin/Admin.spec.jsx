import { fireEvent, screen, within } from '@testing-library/react'
import Usuarios from './Usuarios'
import Reportes from './Reportes'
import Inicio from '../Inicio'
import { cargarDatosDemo, esperarAnimaciones, hastaQue, iniciarComo, montarVista, tabla } from '../../test/ayudantes'

describe('Panel de administración', () => {
  beforeEach(async () => {
    await cargarDatosDemo()
    await iniciarComo('admin')
  })

  it('Inicio del administrador muestra indicadores y accesos al panel', async () => {
    montarVista(<Inicio />)
    expect(await screen.findByText('Usuarios activos')).toBeTruthy()
    expect(screen.getByText('Gestión de usuarios')).toBeTruthy()
  })

  it('Usuarios: crea un nutricionista y exige la especialidad', async () => {
    montarVista(<Usuarios />, { ruta: '/admin/usuarios' })
    fireEvent.click(await screen.findByRole('button', { name: /Nuevo usuario/ }))

    const modal = within(await screen.findByRole('dialog'))
    const llenar = (etiqueta, valor) => fireEvent.change(modal.getByLabelText(etiqueta), { target: { value: valor } })
    llenar('Nombre', 'Rosa')
    llenar('Apellido', 'Toro')
    llenar('RUT', '10000013K')
    llenar('Correo', 'rtoro@nutrivida.cl')
    llenar('Rol', 'nutricionista')
    llenar('Contraseña inicial', 'Nutri2026')
    fireEvent.click(modal.getByRole('button', { name: 'Guardar' }))
    expect(await modal.findByText('Selecciona la especialidad.')).toBeTruthy()

    llenar('Especialidad', 'Nutrición deportiva')
    fireEvent.click(modal.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Usuario Rosa creado.')).toBeTruthy()
    expect(tabla('usuarios').some((u) => u.email === 'rtoro@nutrivida.cl' && u.rol === 'nutricionista')).toBeTrue()
    await esperarAnimaciones()
  })

  it('Usuarios: desactiva una cuenta tras confirmar (mock de window.confirm)', async () => {
    spyOn(window, 'confirm').and.returnValue(true)
    montarVista(<Usuarios />, { ruta: '/admin/usuarios' })

    fireEvent.change(await screen.findByLabelText('Buscar usuario'), { target: { value: 'Marcela' } })
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('Cuenta de Marcela Soto desactivada.')).toBeTruthy()
    expect(tabla('usuarios').find((u) => u.email === 'secretaria@nutrivida.cl').activo).toBeFalse()
  })

  it('Usuarios: filtra por rol', async () => {
    montarVista(<Usuarios />, { ruta: '/admin/usuarios' })
    fireEvent.change(await screen.findByLabelText('Rol'), { target: { value: 'nutricionista' } })

    const filas = document.querySelectorAll('tbody tr')
    expect(filas.length).toBe(4)
  })

  it('Reportes: muestra indicadores y gráficos del período elegido', async () => {
    montarVista(<Reportes />, { ruta: '/admin/reportes' })

    expect(await screen.findByText('Citas en el período')).toBeTruthy()
    expect(screen.getByText('Atenciones por nutricionista')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Últimos 30 días' }))
    await hastaQue(() => screen.getByRole('button', { name: 'Últimos 30 días' }).classList.contains('active'))
  })

  it('Reportes: exporta un CSV sin descargar realmente el archivo (mocks de URL y del enlace)', async () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:reporte')
    spyOn(URL, 'revokeObjectURL')
    const clic = spyOn(HTMLAnchorElement.prototype, 'click')
    montarVista(<Reportes />, { ruta: '/admin/reportes' })

    await screen.findByText('Citas en el período')
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }))

    const blob = URL.createObjectURL.calls.mostRecent().args[0]
    expect(blob.type).toContain('text/csv')
    expect(await blob.text()).toContain('Camila Rojas')
    expect(clic).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reporte')
  })
})
