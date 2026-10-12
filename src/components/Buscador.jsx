import Icono from './Icono'

// Campo de búsqueda con input-group de Bootstrap
export default function Buscador({ valor, onChange, placeholder, etiqueta }) {
  return (
    <div className="input-group">
      <span className="input-group-text bg-body">
        <Icono nombre="buscar" tamano={18} />
      </span>
      <input type="search" className="form-control" placeholder={placeholder} value={valor} onChange={(e) => onChange(e.target.value)} aria-label={etiqueta} />
    </div>
  )
}
