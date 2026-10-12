import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import Offcanvas from 'react-bootstrap/Offcanvas'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { misNotificaciones } from '../services/api'
import { NOMBRE_ROL, ROLES } from '../utils/constantes'
import { iniciales, nombreCompleto } from '../utils/formato'
import Icono from './Icono'
import { Avatar } from './ui'
import LimiteError from './LimiteError'

const { ADMIN, SECRETARIA, NUTRICIONISTA, PACIENTE } = ROLES

const MENU = [
  { a: '/', texto: 'Inicio', icono: 'inicio', roles: [ADMIN, SECRETARIA, NUTRICIONISTA, PACIENTE] },
  { a: '/mis-citas', texto: 'Mis citas', icono: 'calendario', roles: [PACIENTE] },
  { a: '/progreso', texto: 'Mi progreso', icono: 'progreso', roles: [PACIENTE] },
  { a: '/plan', texto: 'Mi plan alimenticio', icono: 'plan', roles: [PACIENTE] },
  { a: '/agenda', texto: 'Agenda de citas', icono: 'calendario', roles: [ADMIN, SECRETARIA, NUTRICIONISTA] },
  { a: '/pacientes', texto: 'Pacientes', icono: 'ficha', roles: [ADMIN, SECRETARIA, NUTRICIONISTA] },
  { a: '/admin/usuarios', texto: 'Usuarios', icono: 'usuarios', roles: [ADMIN] },
  { a: '/admin/reportes', texto: 'Reportes', icono: 'grafico', roles: [ADMIN] },
  { a: '/ubicacion', texto: 'Cómo llegar', icono: 'mapa', roles: [ADMIN, SECRETARIA, NUTRICIONISTA, PACIENTE] },
]

export function Marca({ clara = false }) {
  return (
    <span className={`d-inline-flex align-items-center gap-2 fs-5 ${clara ? 'text-white' : 'text-success-emphasis'}`}>
      <span className={`marca-logo ${clara ? 'marca-logo-clara' : ''}`}>
        <Icono nombre="hoja" tamano={20} />
      </span>
      <span>
        Nutri<strong className={clara ? '' : 'text-success'}>Vida</strong>
      </span>
    </span>
  )
}

export default function Layout() {
  const { usuario, logout } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { data: notificaciones } = useApi(() => misNotificaciones(), [location.pathname])
  const sinLeer = notificaciones?.filter((n) => !n.leida).length ?? 0

  // Cierra el menú móvil al navegar
  const [rutaAnterior, setRutaAnterior] = useState(location.pathname)
  if (rutaAnterior !== location.pathname) {
    setRutaAnterior(location.pathname)
    setMenuAbierto(false)
  }

  const salir = () => {
    logout()
    navigate('/bienvenida', { replace: true })
  }

  if (!usuario) return null

  const items = MENU.filter((m) => m.roles.includes(usuario.rol))
  const claseEnlace = ({ isActive }) => `nav-link d-flex align-items-center gap-3 rounded-2 ${isActive ? 'active' : ''}`

  return (
    <>
      <a href="#contenido" className="visually-hidden-focusable position-absolute top-0 start-0 m-2 btn btn-light z-3">
        Saltar al contenido
      </a>
      <nav className="navbar bg-body border-bottom sticky-top barra-superior px-2 px-md-3">
        <div className="container-fluid px-0 flex-nowrap gap-2">
          <button
            type="button"
            className="navbar-toggler border-0 d-md-none px-2"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            aria-controls="menu-lateral"
            aria-expanded={menuAbierto}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <Link to="/" className="navbar-brand me-auto py-0">
            <Marca />
          </Link>
          <div className="d-flex align-items-center gap-1">
            <Link to="/notificaciones" className="btn btn-light position-relative rounded-circle p-2 lh-1" aria-label={`Notificaciones (${sinLeer} sin leer)`}>
              <Icono nombre="campana" tamano={22} />
              {sinLeer > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{sinLeer > 9 ? '9+' : sinLeer}</span>
              )}
            </Link>
            <Link to="/perfil" className="d-flex align-items-center gap-2 text-decoration-none text-body rounded-pill p-1 pe-md-3 usuario-chip">
              <Avatar texto={iniciales(usuario)} />
              <span className="d-none d-md-flex flex-column lh-sm">
                <strong>{nombreCompleto(usuario)}</strong>
                <small className="text-body-secondary">{NOMBRE_ROL[usuario.rol]}</small>
              </span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="d-flex">
        {/* En móvil es un panel deslizable; desde 768px (md) queda fijo como barra lateral */}
        <Offcanvas show={menuAbierto} onHide={() => setMenuAbierto(false)} responsive="md" id="menu-lateral" className="menu-lateral border-end bg-body">
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>
              <Marca />
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="d-flex flex-column justify-content-between p-3 w-100">
            <nav aria-label="Navegación principal">
              <ul className="nav nav-pills flex-column gap-1">
                {items.map((m) => (
                  <li className="nav-item" key={m.a}>
                    <NavLink to={m.a} end={m.a === '/'} className={claseEnlace}>
                      <Icono nombre={m.icono} />
                      {m.texto}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <ul className="nav nav-pills flex-column gap-1 border-top pt-2 mt-3">
              <li className="nav-item">
                <NavLink to="/perfil" className={claseEnlace}>
                  <Icono nombre="usuario" />
                  Mi perfil
                </NavLink>
              </li>
              <li className="nav-item">
                <button type="button" className="nav-link d-flex align-items-center gap-3 w-100 text-start" onClick={salir}>
                  <Icono nombre="salir" />
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </Offcanvas.Body>
        </Offcanvas>

        <main id="contenido" className="contenido flex-grow-1">
          <div className="container-xl px-3 px-md-4 py-4">
            <LimiteError ruta={location.pathname}>
              <Outlet />
            </LimiteError>
          </div>
        </main>
      </div>
    </>
  )
}
