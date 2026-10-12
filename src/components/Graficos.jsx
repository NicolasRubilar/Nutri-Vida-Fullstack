import { useLayoutEffect, useRef, useState } from 'react'

function useAncho() {
  const ref = useRef(null)
  const [ancho, setAncho] = useState(600)
  useLayoutEffect(() => {
    if (!ref.current) return
    // Mide el ancho real antes de pintar (evita un primer dibujo con el ancho por defecto)
    setAncho(Math.max(260, Math.floor(ref.current.getBoundingClientRect().width)))
    const obs = new ResizeObserver(([e]) => setAncho(Math.max(260, Math.floor(e.contentRect.width))))
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, ancho]
}

function escalaNice(min, max, pasos = 4) {
  if (min === max) {
    min -= 1
    max += 1
  }
  const bruto = (max - min) / pasos
  const mag = 10 ** Math.floor(Math.log10(bruto))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto)
  const ini = Math.floor(min / paso) * paso
  const fin = Math.ceil(max / paso) * paso
  const ticks = []
  for (let v = ini; v <= fin + paso / 2; v += paso) ticks.push(Math.round(v * 100) / 100)
  return { ini, fin, ticks }
}

const fmtNum = (v) => v.toLocaleString('es-CL', { maximumFractionDigits: 1 })

// Gráfico de línea de una sola serie con cursor y tooltip
export function GraficoLinea({ datos, unidad = '', etiquetaX = (x) => x, alto = 240, titulo }) {
  const [ref, ancho] = useAncho()
  const [activo, setActivo] = useState(null)
  if (!datos.length) return null

  const m = { arriba: 16, derecha: 16, abajo: 28, izquierda: 44 }
  const w = ancho - m.izquierda - m.derecha
  const h = alto - m.arriba - m.abajo
  const ys = datos.map((d) => d.y)
  const { ini, fin, ticks } = escalaNice(Math.min(...ys), Math.max(...ys))
  const x = (i) => m.izquierda + (datos.length === 1 ? w / 2 : (i / (datos.length - 1)) * w)
  const y = (v) => m.arriba + h - ((v - ini) / (fin - ini)) * h
  const camino = datos.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.y)}`).join(' ')
  const cadaN = Math.ceil(datos.length / Math.max(2, Math.floor(w / 80)))

  const mover = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    let mejor = 0
    datos.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(mejor) - px)) mejor = i
    })
    setActivo(mejor)
  }

  const d = activo != null ? datos[activo] : null
  const ultimo = datos.length - 1

  return (
    <figure className="grafico" ref={ref}>
      <svg width={ancho} height={alto} role="img" aria-label={titulo} onPointerMove={mover} onPointerLeave={() => setActivo(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grafico-grilla" x1={m.izquierda} x2={ancho - m.derecha} y1={y(t)} y2={y(t)} />
            <text className="grafico-eje" x={m.izquierda - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        {datos.map((p, i) =>
          i % cadaN === 0 || i === ultimo ? (
            <text key={i} className="grafico-eje" x={x(i)} y={alto - 8} textAnchor={i === 0 ? 'start' : i === ultimo ? 'end' : 'middle'}>
              {etiquetaX(p.x)}
            </text>
          ) : null,
        )}
        <path d={camino} className="grafico-linea" />
        {d && <line className="grafico-cursor" x1={x(activo)} x2={x(activo)} y1={m.arriba} y2={m.arriba + h} />}
        {datos.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.y)} r={i === activo ? 5 : 3.5} className="grafico-punto" />
        ))}
        {/* Etiqueta directa del último valor */}
        {activo == null && (
          <text className="grafico-etiqueta" x={x(ultimo) - 10} y={y(datos[ultimo].y) - 14} textAnchor="end">
            {fmtNum(datos[ultimo].y)} {unidad}
          </text>
        )}
      </svg>
      {d && (
        <div className="grafico-tooltip" style={{ left: Math.min(Math.max(x(activo), 70), ancho - 70), top: y(d.y) - 12 }}>
          <span className="text-body-secondary">{etiquetaX(d.x)}</span>
          <strong>
            {fmtNum(d.y)} {unidad}
          </strong>
        </div>
      )}
    </figure>
  )
}

// Barras horizontales de una sola serie (magnitud)
export function GraficoBarras({ datos, formato = fmtNum, titulo }) {
  const max = Math.max(1, ...datos.map((d) => d.valor))
  return (
    <figure className="barras" aria-label={titulo}>
      {datos.map((d) => (
        <div className="barra-fila" key={d.etiqueta} tabIndex={0} title={d.detalle ?? `${d.etiqueta}: ${formato(d.valor)}`}>
          <span className="barra-etiqueta">{d.etiqueta}</span>
          <span className="barra-pista">
            <span className="barra-relleno" style={{ width: `${(d.valor / max) * 100}%` }} />
          </span>
          <span className="barra-valor">{formato(d.valor)}</span>
        </div>
      ))}
    </figure>
  )
}

// Columnas apiladas (máx. 2–3 series) con leyenda y tooltip
export function GraficoColumnas({ datos, series, etiquetaX = (x) => x, alto = 240, titulo }) {
  const [ref, ancho] = useAncho()
  const [activo, setActivo] = useState(null)
  if (!datos.length) return null

  const m = { arriba: 16, derecha: 8, abajo: 28, izquierda: 36 }
  const w = ancho - m.izquierda - m.derecha
  const h = alto - m.arriba - m.abajo
  const totales = datos.map((d) => series.reduce((s, se) => s + d[se.clave], 0))
  const { fin, ticks } = escalaNice(0, Math.max(...totales))
  const banda = w / datos.length
  const anchoBarra = Math.min(40, banda * 0.6)
  const y = (v) => m.arriba + h - (v / fin) * h

  const d = activo != null ? datos[activo] : null
  return (
    <figure className="grafico" ref={ref}>
      <div className="leyenda">
        {series.map((s) => (
          <span key={s.clave}>
            <i style={{ background: s.color }} />
            {s.nombre}
          </span>
        ))}
      </div>
      <svg width={ancho} height={alto} role="img" aria-label={titulo} onPointerLeave={() => setActivo(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grafico-grilla" x1={m.izquierda} x2={ancho - m.derecha} y1={y(t)} y2={y(t)} />
            <text className="grafico-eje" x={m.izquierda - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {datos.map((fila, i) => {
          const cx = m.izquierda + banda * i + banda / 2
          let acumulado = 0
          return (
            <g key={i} onPointerEnter={() => setActivo(i)}>
              <rect x={m.izquierda + banda * i} y={m.arriba} width={banda} height={h} fill="transparent" />
              {series.map((s, si) => {
                const v = fila[s.clave]
                if (!v) return null
                const y0 = y(acumulado)
                acumulado += v
                const y1 = y(acumulado)
                const esTope = series.slice(si + 1).every((o) => !fila[o.clave])
                const altoSeg = Math.max(0, y0 - y1 - (si > 0 ? 2 : 0))
                return (
                  <rect
                    key={s.clave}
                    x={cx - anchoBarra / 2}
                    y={y1}
                    width={anchoBarra}
                    height={altoSeg}
                    rx={esTope ? 4 : 0}
                    fill={s.color}
                    opacity={activo == null || activo === i ? 1 : 0.45}
                  />
                )
              })}
              <text className="grafico-eje" x={cx} y={alto - 8} textAnchor="middle">
                {etiquetaX(fila.x)}
              </text>
            </g>
          )
        })}
      </svg>
      {d && (
        <div className="grafico-tooltip" style={{ left: Math.min(Math.max(m.izquierda + banda * activo + banda / 2, 80), ancho - 80), top: y(totales[activo]) - 8 }}>
          <span className="text-body-secondary">{etiquetaX(d.x)}</span>
          {series.map((s) => (
            <span key={s.clave} className="tooltip-fila">
              <i style={{ background: s.color }} />
              {s.nombre}: <strong>{d[s.clave]}</strong>
            </span>
          ))}
        </div>
      )}
    </figure>
  )
}
