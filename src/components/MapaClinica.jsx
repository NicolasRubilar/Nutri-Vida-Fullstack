import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconoUrl from 'leaflet/dist/images/marker-icon.png'
import iconoRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import sombraUrl from 'leaflet/dist/images/marker-shadow.png'
import { CLINICA } from '../utils/constantes'

// Corrige las rutas de los íconos de Leaflet al empaquetar con Vite
const iconoClinica = L.icon({
  iconUrl: iconoUrl,
  iconRetinaUrl: iconoRetinaUrl,
  shadowUrl: sombraUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const iconoUsuario = L.divIcon({
  className: 'marcador-usuario',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function Encuadre({ origen }) {
  const map = useMap()
  useEffect(() => {
    // Sin animación: si el usuario sale de la página durante un zoom animado, Leaflet
    // intenta mover un mapa ya desmontado y lanza un error (_leaflet_pos)
    if (origen) map.fitBounds([[origen.lat, origen.lng], [CLINICA.lat, CLINICA.lng]], { padding: [40, 40], animate: false })
    else map.setView([CLINICA.lat, CLINICA.lng], 16, { animate: false })
  }, [map, origen])
  return null
}

export default function MapaClinica({ origen, alto = 420 }) {
  const destino = [CLINICA.lat, CLINICA.lng]
  return (
    <MapContainer center={destino} zoom={16} scrollWheelZoom={false} style={{ height: alto }} className="mapa">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={destino} icon={iconoClinica}>
        <Popup>
          <strong>{CLINICA.nombre}</strong>
          <br />
          {CLINICA.direccion}
        </Popup>
      </Marker>
      {origen && (
        <>
          <Marker position={[origen.lat, origen.lng]} icon={iconoUsuario}>
            <Popup>Tu ubicación</Popup>
          </Marker>
          <Polyline positions={[[origen.lat, origen.lng], destino]} pathOptions={{ color: '#1f7a55', dashArray: '6 8', weight: 3 }} />
        </>
      )}
      <Encuadre origen={origen} />
    </MapContainer>
  )
}
