import { useState } from 'react'
import MapaClinica from '../components/MapaClinica'
import { Alerta, EncabezadoPagina } from '../components/ui'
import Icono from '../components/Icono'
import { CLINICA } from '../utils/constantes'

function distanciaKm(a, b) {
  const R = 6371
  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function Ubicacion() {
  const [origen, setOrigen] = useState(null)
  const [estado, setEstado] = useState({ buscando: false, error: '' })

  const ubicarme = () => {
    if (!navigator.geolocation) {
      setEstado({ buscando: false, error: 'Tu navegador no permite obtener la ubicación.' })
      return
    }
    setEstado({ buscando: true, error: '' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigen({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setEstado({ buscando: false, error: '' })
      },
      (err) =>
        setEstado({
          buscando: false,
          error: err.code === 1 ? 'Debes permitir el acceso a tu ubicación para calcular la ruta.' : 'No pudimos obtener tu ubicación. Intenta nuevamente.',
        }),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const destino = `${CLINICA.lat},${CLINICA.lng}`
  const urlGoogle = `https://www.google.com/maps/dir/?api=1&destination=${destino}${origen ? `&origin=${origen.lat},${origen.lng}` : ''}&travelmode=driving`
  const urlWaze = `https://waze.com/ul?ll=${destino}&navigate=yes`
  const km = origen ? distanciaKm(origen, CLINICA) : null

  return (
    <>
      <EncabezadoPagina titulo="Cómo llegar" descripcion="Ubicación de la clínica e indicaciones desde donde estés." />
      <div className="row g-3">
        <div className="col-lg-8">
          <section className="card shadow-sm overflow-hidden">
            <MapaClinica origen={origen} />
          </section>
        </div>
        <div className="col-lg-4">
          <aside className="card shadow-sm">
            <div className="card-body vstack gap-3">
              <h2 className="h5 mb-0">{CLINICA.nombre}</h2>
              <ul className="list-unstyled vstack gap-2 mb-0">
                <li className="d-flex gap-2">
                  <Icono nombre="mapa" tamano={18} className="text-success flex-shrink-0 mt-1" /> {CLINICA.direccion}
                </li>
                <li className="d-flex gap-2">
                  <Icono nombre="reloj" tamano={18} className="text-success flex-shrink-0 mt-1" /> {CLINICA.horario}
                </li>
                <li className="d-flex gap-2">
                  <Icono nombre="telefono" tamano={18} className="text-success flex-shrink-0 mt-1" />
                  <a href={`tel:${CLINICA.telefono.replace(/\s/g, '')}`}>{CLINICA.telefono}</a>
                </li>
              </ul>
              <Alerta>{estado.error}</Alerta>
              {km != null && (
                <div className="bg-success-subtle rounded-3 p-3">
                  <strong className="d-block fs-4 text-success-emphasis">{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}</strong>
                  <span className="text-body-secondary d-block">en línea recta desde tu ubicación</span>
                  <small>
                    Aprox. {Math.max(1, Math.round((km * 1.3) / 0.4))} min en auto · {Math.max(1, Math.round((km * 1.3) / 0.083))} min caminando
                  </small>
                </div>
              )}
              <div className="d-grid gap-2">
                <button className="btn btn-outline-success d-inline-flex align-items-center justify-content-center gap-2" onClick={ubicarme} disabled={estado.buscando}>
                  <Icono nombre="ruta" tamano={18} /> {estado.buscando ? 'Buscando tu ubicación…' : origen ? 'Actualizar mi ubicación' : 'Usar mi ubicación'}
                </button>
                <a className="btn btn-success" href={urlGoogle} target="_blank" rel="noreferrer">
                  Indicaciones en Google Maps
                </a>
                <a className="btn btn-outline-secondary" href={urlWaze} target="_blank" rel="noreferrer">
                  Abrir en Waze
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
