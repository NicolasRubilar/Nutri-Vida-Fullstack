import { useState } from 'react'
import { Link } from 'react-router'
import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { equipoPublico } from '../services/api'
import { Marca } from '../components/Layout'
import MapaClinica from '../components/MapaClinica'
import Icono from '../components/Icono'
import { Avatar } from '../components/ui'
import FormLogin from '../components/FormLogin'
import { CLINICA, NOMBRE_ROL, ROLES } from '../utils/constantes'

// Página pública: solo información institucional, sin datos del sistema.

const SERVICIOS = [
  ['progreso', 'Pérdida de peso', 'Planes con déficit calórico sostenible y seguimiento quincenal de peso, cintura y composición corporal.'],
  ['ficha', 'Enfermedades metabólicas', 'Manejo nutricional de diabetes, resistencia a la insulina, dislipidemia e hipotiroidismo.'],
  ['grafico', 'Nutrición deportiva', 'Alimentación para rendimiento, recuperación y aumento de masa muscular.'],
  ['hoja', 'Alimentación vegetariana y vegana', 'Dietas basadas en plantas equilibradas, con control de B12, hierro y proteínas.'],
]

const PASOS = [
  ['usuario', 'Crea tu cuenta', 'Regístrate en un minuto con tu RUT y correo.'],
  ['calendario', 'Elige nutricionista y horario', 'Indica el motivo de tu consulta y escoge un bloque disponible.'],
  ['check', 'Recibe la confirmación', 'La clínica confirma tu hora y te enviamos un recordatorio antes de la cita.'],
  ['progreso', 'Sigue tu progreso', 'Revisa tus mediciones y tu plan alimenticio cuando quieras.'],
]

const CIFRAS = [
  ['2016', 'atendiendo en Temuco'],
  ['4', 'nutricionistas'],
  ['60+', 'pacientes por semana'],
]

export default function Bienvenida() {
  const { usuario } = useAuth()
  const { data: equipo } = useApi(() => equipoPublico(), [])
  const esPaciente = usuario?.rol === ROLES.PACIENTE
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Enlaces del menú: en móvil primero se cierra el menú y luego se desplaza a la sección,
  // así el cierre no corre la página después del salto.
  const clicMenu = (e) => {
    const enlace = e.target.closest('a')
    if (!enlace) return
    const hash = enlace.getAttribute('href')
    if (!hash?.startsWith('#')) return setMenuAbierto(false)
    e.preventDefault()
    const estabaAbierto = menuAbierto
    setMenuAbierto(false)
    setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      history.replaceState(null, '', hash)
    }, estabaAbierto ? 380 : 0)
  }

  // Destino de los botones "Agendar": registro si no hay sesión, formulario de cita si es paciente
  const agendar = (nutriId) => {
    const nutri = nutriId ? `&nutri=${nutriId}` : ''
    if (!usuario) return `/registro?agendar=1${nutri}`
    return esPaciente ? `/mis-citas?nueva=1${nutri}` : '/'
  }

  return (
    <div className="bienvenida bg-white">
      <Navbar expand="lg" sticky="top" className="bg-white border-bottom py-2" expanded={menuAbierto} onToggle={setMenuAbierto}>
        <div className="container">
          <Navbar.Brand as={Link} to="/bienvenida">
            <Marca />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="menu-publico" />
          <Navbar.Collapse id="menu-publico" onClick={clicMenu}>
            <Nav className="mx-auto gap-lg-2">
              <Nav.Link href="#servicios">Servicios</Nav.Link>
              <Nav.Link href="#como-funciona">Cómo funciona</Nav.Link>
              <Nav.Link href="#equipo">Equipo</Nav.Link>
              <Nav.Link href="#ubicacion">Ubicación</Nav.Link>
            </Nav>
            <div className="d-flex flex-column flex-lg-row gap-2 py-3 py-lg-0">
              {usuario ? (
                <Link to="/" className="btn btn-success">
                  Ir a mi panel
                </Link>
              ) : (
                <>
                  <a href="#acceso" className="btn btn-outline-success">
                    Iniciar sesión
                  </a>
                  <Link to="/registro?agendar=1" className="btn btn-success">
                    Registrarme
                  </Link>
                </>
              )}
            </div>
          </Navbar.Collapse>
        </div>
      </Navbar>

      <main>
        {/* Portada */}
        <section className="hero text-white">
          <div className="container py-5">
            <div className="row align-items-center g-5 py-lg-4">
              <div className="col-lg-6">
                <span className="badge rounded-pill bg-white bg-opacity-25 mb-3">Clínica de nutrición y dietética · Temuco</span>
                <h1 className="display-5 fw-bold mb-3">Tu salud empieza en lo que comes.</h1>
                <p className="lead mb-4 opacity-90">
                  Asesoría nutricional personalizada con seguimiento real. Agenda tu hora en línea, revisa tu progreso y lleva tu plan alimenticio siempre contigo.
                </p>
                <div className="d-flex flex-column flex-sm-row gap-2">
                  <Link to={agendar()} className="btn btn-light btn-lg text-success fw-semibold">
                    Agenda tu hora
                  </Link>
                </div>
              </div>
              {/* Sección de acceso: inicio de sesión dentro de la página informativa */}
              <div className="col-lg-6 col-xl-5 offset-xl-1" id="acceso">
                {usuario ? (
                  <div className="card shadow-lg border-0 text-body acceso-tarjeta mx-auto">
                    <div className="card-body p-4 vstack gap-3">
                      <h2 className="h4 mb-0">Hola, {usuario.nombre}</h2>
                      <p className="text-body-secondary mb-0">Ya iniciaste sesión como {NOMBRE_ROL[usuario.rol].toLowerCase()}.</p>
                      <Link to="/" className="btn btn-success btn-lg">
                        Ir a mi panel
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto acceso-tarjeta">
                    <FormLogin
                      encabezado={
                        <div>
                          <h2 className="h4 mb-1">Accede a tu cuenta</h2>
                          <p className="text-body-secondary small mb-0">Pacientes y equipo de la clínica.</p>
                        </div>
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Cifras */}
        <section className="border-bottom">
          <div className="container py-4">
            <div className="row row-cols-3 text-center g-2">
              {CIFRAS.map(([valor, texto]) => (
                <div className="col" key={texto}>
                  <strong className="d-block fs-2 text-success">{valor}</strong>
                  <span className="small text-body-secondary">{texto}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="py-5">
          <div className="container py-lg-3">
            <Encabezado titulo="Nuestros servicios" texto="Cuatro áreas de especialidad para acompañarte según tu objetivo." />
            <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
              {SERVICIOS.map(([icono, titulo, texto]) => (
                <div className="col" key={titulo}>
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <span className="icono-circular bg-success-subtle text-success mb-3">
                        <Icono nombre={icono} />
                      </span>
                      <h3 className="h6">{titulo}</h3>
                      <p className="small text-body-secondary mb-0">{texto}</p>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="py-5 bg-success-subtle">
          <div className="container py-lg-3">
            <Encabezado titulo="Agenda sin llamar por teléfono" texto="Todo el proceso es en línea, desde tu celular o computador." />
            <ol className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4 list-unstyled mb-4">
              {PASOS.map(([icono, titulo, texto], i) => (
                <li className="col" key={titulo}>
                  <div className="d-flex gap-3">
                    <span className="paso-numero">{i + 1}</span>
                    <div>
                      <h3 className="h6 d-flex align-items-center gap-2">
                        <Icono nombre={icono} tamano={18} className="text-success" />
                        {titulo}
                      </h3>
                      <p className="small text-body-secondary mb-0">{texto}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="text-center">
              <Link to={agendar()} className="btn btn-success btn-lg">
                Comenzar ahora
              </Link>
            </div>
          </div>
        </section>

        {/* Equipo */}
        <section id="equipo" className="py-5">
          <div className="container py-lg-3">
            <Encabezado titulo="Nuestro equipo" texto="Elige al profesional que mejor se ajuste a tu objetivo." />
            <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
              {(equipo ?? []).map((n) => (
                <div className="col" key={n.id}>
                  <article className="card h-100 shadow-sm text-center">
                    <div className="card-body p-4 d-flex flex-column align-items-center gap-2">
                      <Avatar grande texto={n.nombre.split(' ').map((p) => p[0]).join('').slice(0, 2)} />
                      <h3 className="h6 mb-0">{n.nombre}</h3>
                      <span className="badge rounded-pill text-bg-light border">{n.especialidad}</span>
                    </div>
                    <div className="card-footer bg-white border-0 pb-4">
                      <Link to={agendar(n.id)} className="btn btn-outline-success btn-sm">
                        Agendar con {n.nombre.split(' ')[0]}
                      </Link>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ubicación */}
        <section id="ubicacion" className="py-5 bg-body-tertiary">
          <div className="container py-lg-3">
            <Encabezado titulo="¿Dónde estamos?" texto="En pleno centro de Temuco, con estacionamiento cercano." />
            <div className="row g-4 align-items-stretch">
              <div className="col-lg-8">
                <div className="card shadow-sm overflow-hidden h-100">
                  <MapaClinica />
                </div>
              </div>
              <div className="col-lg-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body p-4 vstack gap-3">
                    <h3 className="h5 mb-0">{CLINICA.nombre}</h3>
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
                    <a
                      className="btn btn-outline-success mt-auto"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${CLINICA.lat},${CLINICA.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Cómo llegar
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Llamado final */}
        <section className="hero text-white text-center">
          <div className="container py-5">
            <h2 className="h1 fw-bold">¿Listo para empezar?</h2>
            <p className="lead opacity-90 mb-4">Crea tu cuenta y solicita tu primera consulta hoy.</p>
            <Link to={agendar()} className="btn btn-light btn-lg text-success fw-semibold">
              Agenda tu hora
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-4 border-top">
        <div className="container d-flex flex-column flex-md-row justify-content-between gap-2 small text-body-secondary">
          <span>
            © {new Date().getFullYear()} {CLINICA.nombre}
          </span>
          <span>
            {CLINICA.email} · {CLINICA.telefono}
          </span>
        </div>
      </footer>
    </div>
  )
}

function Encabezado({ titulo, texto }) {
  return (
    <div className="text-center mx-auto mb-4 mb-lg-5" style={{ maxWidth: 620 }}>
      <h2 className="h2 fw-bold">{titulo}</h2>
      <p className="text-body-secondary mb-0">{texto}</p>
    </div>
  )
}

