import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import * as api from '../../services/api'
import { Cargando, EncabezadoPagina, ErrorApi, EstadoCita, Segmentado, Stat, Vacio } from '../../components/ui'
import { GraficoBarras, GraficoColumnas } from '../../components/Graficos'
import Icono from '../../components/Icono'
import { ESTADOS_CITA } from '../../utils/constantes'
import { hoyISO, sumarDias } from '../../utils/formato'

const PERIODOS = [
  ['30', 'Últimos 30 días'],
  ['90', 'Últimos 3 meses'],
  ['180', 'Últimos 6 meses'],
  ['365', 'Último año'],
]

const SERIES_MES = [
  { clave: 'atendidas', nombre: 'Atendidas', color: 'var(--serie-1)' },
  { clave: 'inasistencias', nombre: 'Inasistencias', color: 'var(--serie-2)' },
]

const pct = (v) => `${Math.round(v * 1000) / 10} %`
const nombreMes = (m) => {
  const [y, mes] = m.split('-').map(Number)
  return new Date(y, mes - 1, 1).toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
}

function Tarjeta({ titulo, children, sinRelleno = false }) {
  return (
    <section className="card shadow-sm h-100">
      <div className="card-header bg-body py-3">
        <h2 className="h6 mb-0">{titulo}</h2>
      </div>
      {sinRelleno ? children : <div className="card-body">{children}</div>}
    </section>
  )
}

export default function Reportes() {
  const hoy = hoyISO()
  const [rango, setRango] = useState({ desde: sumarDias(hoy, -180), hasta: hoy, preset: '180' })
  const { data: s, cargando, error } = useApi(() => api.estadisticas(rango), [rango.desde, rango.hasta])

  const exportar = () => {
    if (!s) return
    const filas = [
      ['Nutricionista', 'Especialidad', 'Citas', 'Atendidas', 'Inasistencias', 'Tasa inasistencia', 'Pacientes asignados'],
      ...s.porNutricionista.map((n) => [n.nombre, n.especialidad, n.total, n.atendidas, n.inasistencias, pct(n.tasaInasistencia), n.pacientes]),
      [],
      ['Mes', 'Atendidas', 'Inasistencias'],
      ...s.porMes.map((m) => [m.mes, m.atendidas, m.inasistencias]),
    ]
    const csv = filas.map((f) => f.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-nutrivida-${rango.desde}-a-${rango.hasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <EncabezadoPagina titulo="Reportes" descripcion="Atenciones por período, tasa de inasistencia y distribución por nutricionista.">
        <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={exportar} disabled={!s}>
          <Icono nombre="ficha" tamano={18} /> Exportar CSV
        </button>
      </EncabezadoPagina>

      <div className="row g-2 align-items-center mb-3">
        <div className="col-12 col-xl-auto">
          <Segmentado
            etiqueta="Período"
            valor={rango.preset}
            onChange={(dias) => setRango({ desde: sumarDias(hoy, -Number(dias)), hasta: hoy, preset: dias })}
            opciones={PERIODOS}
          />
        </div>
        <div className="col-sm-6 col-xl">
          <div className="input-group">
            <label className="input-group-text" htmlFor="desde">
              Desde
            </label>
            <input id="desde" type="date" className="form-control" value={rango.desde} max={rango.hasta} onChange={(e) => e.target.value && setRango({ ...rango, desde: e.target.value, preset: '' })} />
          </div>
        </div>
        <div className="col-sm-6 col-xl">
          <div className="input-group">
            <label className="input-group-text" htmlFor="hasta">
              Hasta
            </label>
            <input id="hasta" type="date" className="form-control" value={rango.hasta} min={rango.desde} onChange={(e) => e.target.value && setRango({ ...rango, hasta: e.target.value, preset: '' })} />
          </div>
        </div>
      </div>

      {cargando ? (
        <Cargando />
      ) : error ? (
        <ErrorApi error={error} />
      ) : !s.total ? (
        <Vacio icono="grafico" titulo="No hay citas en este período" />
      ) : (
        <div className="vstack gap-3">
          <div className="row row-cols-2 row-cols-lg-4 g-3">
            <Stat etiqueta="Citas en el período" valor={s.total} icono="calendario" />
            <Stat etiqueta="Atenciones realizadas" valor={s.porEstado.find((e) => e.estado === ESTADOS_CITA.ATENDIDA).cantidad} icono="check" />
            <Stat etiqueta="Tasa de inasistencia" valor={pct(s.tasaInasistencia)} detalle="Inasistencias / (atendidas + inasistencias)" icono="alerta" />
            <Stat etiqueta="Cancelaciones" valor={s.porEstado.find((e) => e.estado === ESTADOS_CITA.CANCELADA).cantidad} icono="cerrar" />
          </div>

          <Tarjeta titulo="Atenciones e inasistencias por mes">
            <GraficoColumnas datos={s.porMes.map((m) => ({ ...m, x: m.mes }))} series={SERIES_MES} etiquetaX={nombreMes} titulo="Atenciones e inasistencias por mes" />
          </Tarjeta>

          <div className="row g-3">
            <div className="col-lg-6">
              <Tarjeta titulo="Atenciones por nutricionista">
                <GraficoBarras
                  titulo="Atenciones por nutricionista"
                  datos={s.porNutricionista.map((n) => ({ etiqueta: n.nombre, valor: n.atendidas, detalle: `${n.nombre}: ${n.atendidas} atenciones de ${n.total} citas` }))}
                />
              </Tarjeta>
            </div>
            <div className="col-lg-6">
              <Tarjeta titulo="Motivos de consulta">
                <GraficoBarras titulo="Motivos de consulta" datos={s.porMotivo.map((m) => ({ etiqueta: m.motivo, valor: m.cantidad }))} />
              </Tarjeta>
            </div>
          </div>

          <Tarjeta titulo="Detalle por nutricionista" sinRelleno>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 tabla-movil">
                <thead className="table-light">
                  <tr>
                    <th>Nutricionista</th>
                    <th>Especialidad</th>
                    <th className="text-end">Citas</th>
                    <th className="text-end">Atendidas</th>
                    <th className="text-end">Inasistencias</th>
                    <th className="text-end">% inasistencia</th>
                    <th className="text-end">Pacientes</th>
                  </tr>
                </thead>
                <tbody>
                  {s.porNutricionista.map((n) => (
                    <tr key={n.id}>
                      <td data-label="Nutricionista" className="fw-semibold">
                        {n.nombre}
                      </td>
                      <td data-label="Especialidad">{n.especialidad}</td>
                      <td data-label="Citas" className="text-end">{n.total}</td>
                      <td data-label="Atendidas" className="text-end">{n.atendidas}</td>
                      <td data-label="Inasistencias" className="text-end">{n.inasistencias}</td>
                      <td data-label="% inasistencia" className="text-end">{pct(n.tasaInasistencia)}</td>
                      <td data-label="Pacientes" className="text-end">{n.pacientes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Citas por estado">
            <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-3">
              {s.porEstado.map((e) => (
                <div className="col" key={e.estado}>
                  <EstadoCita estado={e.estado} />
                  <strong className="d-block fs-4 mt-1">{e.cantidad}</strong>
                </div>
              ))}
            </div>
          </Tarjeta>
        </div>
      )}
    </>
  )
}
