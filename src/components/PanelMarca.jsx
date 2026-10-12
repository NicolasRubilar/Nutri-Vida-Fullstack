import { Link } from 'react-router'
import Icono from './Icono'
import { Marca } from './Layout'
import { CLINICA } from '../utils/constantes'

const BENEFICIOS = [
  ['calendario', 'Agenda, reprograma o cancela tus citas sin llamar.'],
  ['progreso', 'Revisa tu progreso y tus mediciones cuando quieras.'],
  ['plan', 'Tu plan alimenticio siempre disponible, en cualquier dispositivo.'],
  ['escudo', 'Tus datos de salud solo los ves tú y tu nutricionista.'],
]

// Columna de marca de las pantallas de acceso (se compacta en móvil)
export default function PanelMarca() {
  return (
    <aside className="col-md-5 col-xl-4 panel-marca text-white d-flex flex-column gap-3 gap-md-4 p-4 p-lg-5">
      <Link to="/bienvenida" className="text-decoration-none">
        <Marca clara />
      </Link>
      <h2 className="h4 fw-semibold text-white mb-0">Asesoría nutricional personalizada en Temuco desde 2016.</h2>
      <ul className="list-unstyled d-none d-md-flex flex-column gap-3 mb-0">
        {BENEFICIOS.map(([icono, texto]) => (
          <li key={icono} className="d-flex gap-3 align-items-start">
            <Icono nombre={icono} className="flex-shrink-0 mt-1" />
            {texto}
          </li>
        ))}
      </ul>
      <p className="small opacity-75 mt-auto mb-0 d-none d-md-block">
        {CLINICA.direccion}
        <br />
        {CLINICA.telefono} · {CLINICA.horario}
      </p>
    </aside>
  )
}
