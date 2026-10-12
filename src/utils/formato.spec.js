import {
  calcularIMC,
  categoriaIMC,
  edad,
  esFinDeSemana,
  formatearRut,
  iniciales,
  sumarDias,
  validarEmail,
  validarPassword,
  validarRut,
} from './formato'

describe('utils/formato', () => {
  describe('validarRut', () => {
    it('acepta RUT válidos con y sin formato, incluido dígito verificador K', () => {
      expect(validarRut('12.345.678-5')).toBeTrue()
      expect(validarRut('123456785')).toBeTrue()
      expect(validarRut('11.111.111-1')).toBeTrue()
      expect(validarRut('10.000.013-K')).toBeTrue()
      expect(validarRut('10000013k')).toBeTrue()
    })

    it('rechaza RUT con dígito verificador incorrecto o largo inválido', () => {
      expect(validarRut('12.345.678-9')).toBeFalse()
      expect(validarRut('1234')).toBeFalse()
      expect(validarRut('')).toBeFalse()
    })
  })

  it('formatearRut agrega puntos y guion', () => {
    expect(formatearRut('123456785')).toBe('12.345.678-5')
    expect(formatearRut('10000013k')).toBe('10.000.013-K')
  })

  it('calcularIMC redondea a un decimal y categoriaIMC clasifica según la OMS', () => {
    expect(calcularIMC(70, 175)).toBe(22.9)
    expect(calcularIMC(96, 176)).toBe(31)
    expect(calcularIMC(null, 170)).toBeNull()
    expect(categoriaIMC(17)).toBe('Bajo peso')
    expect(categoriaIMC(22.9)).toBe('Normal')
    expect(categoriaIMC(27)).toBe('Sobrepeso')
    expect(categoriaIMC(31)).toBe('Obesidad')
  })

  it('validarPassword indica cada requisito que falta', () => {
    expect(validarPassword('Segura2026')).toEqual([])
    expect(validarPassword('abc')).toEqual(['al menos 8 caracteres', 'una mayúscula', 'un número'])
    expect(validarPassword('SOLOMAYUS1')).toContain('una minúscula')
  })

  it('validarEmail exige formato usuario@dominio.ext', () => {
    expect(validarEmail('ana@correo.cl')).toBeTrue()
    expect(validarEmail('ana@correo')).toBeFalse()
    expect(validarEmail('ana correo.cl')).toBeFalse()
  })

  it('maneja fechas locales: sumar días, fin de semana y edad', () => {
    expect(sumarDias('2026-02-27', 3)).toBe('2026-03-02')
    expect(esFinDeSemana('2026-10-10')).toBeTrue() // sábado
    expect(esFinDeSemana('2026-10-12')).toBeFalse() // lunes

    // Mock del reloj: "hoy" es 15-03-2026
    jasmine.clock().install()
    jasmine.clock().mockDate(new Date(2026, 2, 15))
    expect(edad('2000-03-15')).toBe(26)
    expect(edad('2000-03-16')).toBe(25)
    jasmine.clock().uninstall()
  })

  it('iniciales toma la primera letra de nombre y apellido', () => {
    expect(iniciales({ nombre: 'pedro', apellido: 'sandoval' })).toBe('PS')
    expect(iniciales(null)).toBe('?')
  })
})
