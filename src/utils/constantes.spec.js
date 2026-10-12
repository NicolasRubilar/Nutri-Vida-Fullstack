import { destinoTrasLogin, puedeAcceder } from './constantes'

describe('utils/constantes: control de acceso por rol (RBAC)', () => {
  it('solo el paciente accede a sus vistas de citas, progreso y plan', () => {
    expect(puedeAcceder('/mis-citas', 'paciente')).toBeTrue()
    expect(puedeAcceder('/progreso', 'nutricionista')).toBeFalse()
    expect(puedeAcceder('/plan', 'admin')).toBeFalse()
  })

  it('el panel de administración es exclusivo del administrador', () => {
    expect(puedeAcceder('/admin/usuarios', 'admin')).toBeTrue()
    expect(puedeAcceder('/admin/reportes', 'secretaria')).toBeFalse()
    expect(puedeAcceder('/admin/usuarios', 'paciente')).toBeFalse()
  })

  it('la secretaria ve la lista de pacientes pero no la ficha clínica', () => {
    expect(puedeAcceder('/pacientes', 'secretaria')).toBeTrue()
    expect(puedeAcceder('/pacientes/abc-123', 'secretaria')).toBeFalse()
    expect(puedeAcceder('/pacientes/abc-123', 'nutricionista')).toBeTrue()
  })

  it('ignora los parámetros de la URL y deja libres las vistas comunes', () => {
    expect(puedeAcceder('/mis-citas?nueva=1', 'paciente')).toBeTrue()
    expect(puedeAcceder('/ubicacion', 'secretaria')).toBeTrue()
  })

  it('destinoTrasLogin vuelve a la vista pedida solo si el rol tiene permiso', () => {
    expect(destinoTrasLogin('/admin/reportes', 'admin')).toBe('/admin/reportes')
    expect(destinoTrasLogin('/admin/reportes', 'paciente')).toBe('/')
    expect(destinoTrasLogin(undefined, 'paciente')).toBe('/')
  })
})
