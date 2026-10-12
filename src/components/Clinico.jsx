import { useState } from 'react'
import Accordion from 'react-bootstrap/Accordion'
import { GraficoLinea } from './Graficos'
import { Segmentado, Stat, Vacio } from './ui'
import { calcularIMC, categoriaIMC, formatoFecha } from '../utils/formato'
import { COMIDAS } from '../utils/constantes'

const METRICAS = [
  { clave: 'peso', nombre: 'Peso', unidad: 'kg' },
  { clave: 'imc', nombre: 'IMC', unidad: '' },
  { clave: 'cintura', nombre: 'Cintura', unidad: 'cm' },
  { clave: 'grasa', nombre: '% grasa', unidad: '%' },
]

const conIMC = (m) => ({ ...m, imc: calcularIMC(m.peso, m.talla) })

export function ResumenProgreso({ mediciones }) {
  if (!mediciones.length) return null
  const primera = conIMC(mediciones[0])
  const ultima = conIMC(mediciones.at(-1))
  const dif = (clave) => {
    if (ultima[clave] == null || primera[clave] == null) return ''
    const d = Math.round((ultima[clave] - primera[clave]) * 10) / 10
    return `${d > 0 ? '+' : ''}${d} desde ${formatoFecha(primera.fecha)}`
  }
  return (
    <div className="row row-cols-2 row-cols-lg-4 g-3">
      <Stat etiqueta="Peso" valor={`${ultima.peso} kg`} detalle={dif('peso')} icono="progreso" />
      <Stat etiqueta="IMC" valor={ultima.imc ?? '—'} detalle={categoriaIMC(ultima.imc)} icono="grafico" />
      <Stat etiqueta="Cintura" valor={ultima.cintura ? `${ultima.cintura} cm` : '—'} detalle={dif('cintura')} icono="usuario" />
      <Stat etiqueta="% grasa" valor={ultima.grasa ? `${ultima.grasa} %` : '—'} detalle={dif('grasa')} icono="hoja" />
    </div>
  )
}

export function GraficoProgreso({ mediciones }) {
  const [metrica, setMetrica] = useState('peso')
  const m = METRICAS.find((x) => x.clave === metrica)
  const datos = mediciones
    .map(conIMC)
    .filter((x) => x[metrica] != null)
    .map((x) => ({ x: x.fecha, y: x[metrica] }))

  return (
    <section className="card shadow-sm">
      <div className="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
        <h2 className="h6 mb-0">Evolución de {m.nombre.toLowerCase()}</h2>
        <Segmentado chico etiqueta="Indicador" valor={metrica} onChange={setMetrica} opciones={METRICAS.map((x) => [x.clave, x.nombre])} />
      </div>
      <div className="card-body">
        {datos.length >= 2 ? (
          <GraficoLinea datos={datos} unidad={m.unidad} titulo={`Evolución de ${m.nombre}`} etiquetaX={(f) => formatoFecha(f, { year: '2-digit' })} />
        ) : (
          <Vacio icono="progreso" titulo="Se necesitan al menos dos mediciones para ver la evolución" />
        )}
      </div>
    </section>
  )
}

export function TablaMediciones({ mediciones, onEditar, onEliminar }) {
  if (!mediciones.length) return <Vacio icono="ficha" titulo="Sin mediciones registradas" />
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0 tabla-movil">
        <thead className="table-light">
          <tr>
            <th>Fecha</th>
            <th className="text-end">Peso (kg)</th>
            <th className="text-end">Talla (cm)</th>
            <th className="text-end">IMC</th>
            <th className="text-end">Cintura (cm)</th>
            <th className="text-end">% grasa</th>
            <th>Notas</th>
            {onEditar && (
              <th>
                <span className="visually-hidden">Acciones</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {[...mediciones].reverse().map((m) => (
            <tr key={m.id}>
              <td data-label="Fecha">{formatoFecha(m.fecha)}</td>
              <td data-label="Peso" className="text-end">{m.peso}</td>
              <td data-label="Talla" className="text-end">{m.talla}</td>
              <td data-label="IMC" className="text-end">{calcularIMC(m.peso, m.talla)}</td>
              <td data-label="Cintura" className="text-end">{m.cintura ?? '—'}</td>
              <td data-label="% grasa" className="text-end">{m.grasa ?? '—'}</td>
              <td data-label="Notas">{m.notas || '—'}</td>
              {onEditar && (
                <td className="text-nowrap">
                  <button className="btn btn-link btn-sm" onClick={() => onEditar(m)}>
                    Editar
                  </button>
                  <button className="btn btn-link btn-sm link-danger" onClick={() => onEliminar(m)}>
                    Eliminar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function VistaPlan({ plan }) {
  return (
    <div className="vstack gap-3">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <span className="small text-body-secondary">Objetivo</span>
          <h3 className="h5 mb-0">{plan.objetivo}</h3>
        </div>
        {plan.calorias && (
          <div className="text-center bg-success-subtle text-success-emphasis rounded-3 px-3 py-2">
            <strong className="d-block fs-4 lh-1">{plan.calorias.toLocaleString('es-CL')}</strong>
            <small>kcal / día</small>
          </div>
        )}
      </div>
      <div className="row row-cols-1 row-cols-lg-2 g-2">
        {COMIDAS.filter(([k]) => plan[k]).map(([k, nombre]) => (
          <div className="col" key={k}>
            <div className="border rounded-2 p-3 h-100 comida">
              <strong>{nombre}</strong>
              <p className="mb-0 mt-1">{plan[k]}</p>
            </div>
          </div>
        ))}
      </div>
      {plan.indicaciones && (
        <div className="alert alert-warning mb-0">
          <strong>Indicaciones</strong>
          <p className="mb-0 mt-1">{plan.indicaciones}</p>
        </div>
      )}
      <p className="small text-body-secondary mb-0">
        Indicado por {plan.nutricionista} el {formatoFecha(plan.fecha)}
      </p>
    </div>
  )
}

// Planes anteriores en un acordeón de Bootstrap
export function PlanesAnteriores({ planes }) {
  if (!planes.length) return null
  return (
    <section className="card shadow-sm no-imprimir">
      <div className="card-header bg-body py-3">
        <h2 className="h6 mb-0">Planes anteriores</h2>
      </div>
      <Accordion flush>
        {planes.map((p) => (
          <Accordion.Item eventKey={p.id} key={p.id}>
            <Accordion.Header>
              {formatoFecha(p.fecha)} — {p.objetivo}
            </Accordion.Header>
            <Accordion.Body>
              <VistaPlan plan={p} />
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  )
}
