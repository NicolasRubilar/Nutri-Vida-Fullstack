import { Link } from 'react-router'
import Icono from '../components/Icono'

export function SinPermiso() {
  return (
    <div className="d-flex flex-column align-items-center gap-3 text-center py-5 px-3">
      <Icono nombre="escudo" tamano={48} className="text-success" />
      <h1 className="h3 mb-0">Acceso restringido</h1>
      <p className="text-body-secondary mb-0">Tu rol no tiene permiso para ver esta sección.</p>
      <Link to="/" className="btn btn-success">
        Volver al inicio
      </Link>
    </div>
  )
}

export function NoEncontrada() {
  return (
    <div className="d-flex flex-column align-items-center gap-3 text-center py-5 px-3">
      <Icono nombre="buscar" tamano={48} className="text-success" />
      <h1 className="h3 mb-0">Página no encontrada</h1>
      <p className="text-body-secondary mb-0">La dirección que buscas no existe.</p>
      <Link to="/" className="btn btn-success">
        Volver al inicio
      </Link>
    </div>
  )
}
