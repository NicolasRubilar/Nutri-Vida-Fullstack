import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import * as api from '../services/api'
import { Alerta, Cargando, EncabezadoPagina, ErrorApi, EstadoCita, Stat, Vacio } from '../components/ui'
import Icono from '../components/Icono'
import { ESTADOS_CITA, ROLES } from '../utils/constantes'
import { calcularIMC, categoriaIMC, formatoFecha, formatoFechaLarga, hoyISO, sumarDias } from '../utils/formato'

export default function Inicio() {
  const { usuario } = useAuth()
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  return (
    <>
      <EncabezadoPagina titulo={`${saludo}, ${usuario.nombre}`} descripcion={formatoFechaLarga(hoyISO())} />
      {usuario.rol === ROLES.PACIENTE && <InicioPaciente />}
      {usuario.rol === ROLES.NUTRICIONISTA && <InicioStaff esNutri />}
      {usuario.rol === ROLES.SECRETARIA && <InicioStaff />}
      {usuario.rol === ROLES.ADMIN && <InicioAdmin />}
    </>
  )
}

function Tarjeta({ titulo, accion, children }) {
  return (
    <section className="card shadow-sm h-100">
      <div className="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
        <h2 className="h6 mb-0">{titulo}</h2>
        {accion}
      </div>
      <div className="card-body">{children}</div>
    </section>
  )
}

function ItemCita({ c }) {
  return (
    <li className="list-group-item d-flex align-items-center gap-3 px-0">
      <div className="text-center bg-success-subtle rounded-2 px-2 py-1 flex-shrink-0">
        <strong className="d-block">{c.hora}</strong>
        <small className="text-body-secondary">{formatoFecha(c.fecha, { year: undefined })}</small>
      </div>
      <div className="flex-grow-1 min-w-0">
        <strong className="d-block">{c.paciente?.nombre}</strong>
        <small className="text-body-secondary">
          con {c.nutricionista?.nombre} · {c.motivo}
        </small>
      </div>
      <EstadoCita estado={c.estado} requiereReprogramacion={c.requiereReprogramacion} />
    </li>
  )
}

function InicioPaciente() {
  const { data, cargando, error } = useApi(async () => {
    const perfil = await api.miPerfilPaciente()
    const [citas, mediciones, planes, notificaciones] = await Promise.all([
      api.listarCitas({ desde: hoyISO() }),
      api.listarMediciones(perfil.id),
      api.listarPlanes(perfil.id),
      api.misNotificaciones(),
    ])
    return { perfil, citas, mediciones, planes, notificaciones }
  })
  if (cargando) return <Cargando />
  if (error) return <ErrorApi error={error} />

  const { perfil, citas, mediciones, planes, notificaciones } = data
  const proxima = citas.find((c) => [ESTADOS_CITA.CONFIRMADA, ESTADOS_CITA.PENDIENTE].includes(c.estado))
  const recordatorios = notificaciones.filter((n) => !n.leida && ['recordatorio', 'alerta'].includes(n.tipo))
  const ultima = mediciones.at(-1)
  const primera = mediciones[0]
  const plan = planes.find((p) => p.vigente)
  const imc = ultima && calcularIMC(ultima.peso, ultima.talla)
  const dif = ultima && primera ? Math.round((ultima.peso - primera.peso) * 10) / 10 : null

  return (
    <div className="vstack gap-3">
      {recordatorios.map((n) => (
        <Alerta key={n.id} tipo={n.tipo === 'alerta' ? 'advertencia' : 'info'}>
          <strong>{n.titulo}.</strong> {n.mensaje}
        </Alerta>
      ))}

      <div className="row row-cols-2 row-cols-lg-4 g-3">
        <Stat etiqueta="Peso actual" icono="progreso" valor={ultima ? `${ultima.peso} kg` : '—'} detalle={dif != null ? `${dif > 0 ? '+' : ''}${dif} kg desde el inicio` : 'Sin mediciones aún'} />
        <Stat etiqueta="IMC" icono="grafico" valor={imc ?? '—'} detalle={categoriaIMC(imc)} />
        <Stat etiqueta="Cintura" icono="usuario" valor={ultima?.cintura ? `${ultima.cintura} cm` : '—'} detalle={ultima ? `Medido el ${formatoFecha(ultima.fecha)}` : ''} />
        <Stat etiqueta="Nutricionista" icono="hoja" valor={perfil.nutricionista?.nombre ?? 'Por asignar'} detalle={perfil.nutricionista?.especialidad} />
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <Tarjeta
            titulo="Próxima cita"
            accion={
              <Link to="/mis-citas" className="btn btn-outline-secondary btn-sm">
                Ver todas
              </Link>
            }
          >
            {proxima ? (
              <div className="vstack gap-2">
                <div className="d-flex align-items-center gap-3">
                  <Icono nombre="calendario" tamano={28} className="text-success" />
                  <div>
                    <strong className="d-block fs-5 primera-mayuscula">{formatoFechaLarga(proxima.fecha)}</strong>
                    <span>
                      {proxima.hora} hrs · {proxima.nutricionista?.nombre}
                    </span>
                  </div>
                </div>
                <div>
                  <EstadoCita estado={proxima.estado} requiereReprogramacion={proxima.requiereReprogramacion} />
                </div>
                <p className="text-body-secondary mb-0">Motivo: {proxima.motivo}</p>
              </div>
            ) : (
              <Vacio icono="calendario" titulo="No tienes citas próximas">
                <Link to="/mis-citas?nueva=1" className="btn btn-success btn-sm">
                  Solicitar cita
                </Link>
              </Vacio>
            )}
          </Tarjeta>
        </div>
        <div className="col-lg-6">
          <Tarjeta
            titulo="Plan alimenticio vigente"
            accion={
              <Link to="/plan" className="btn btn-outline-secondary btn-sm">
                Ver plan
              </Link>
            }
          >
            {plan ? (
              <dl className="mb-0">
                <dt className="small text-body-secondary text-uppercase">Objetivo</dt>
                <dd>{plan.objetivo}</dd>
                {plan.calorias && (
                  <>
                    <dt className="small text-body-secondary text-uppercase">Calorías diarias</dt>
                    <dd>{plan.calorias.toLocaleString('es-CL')} kcal</dd>
                  </>
                )}
                <dt className="small text-body-secondary text-uppercase">Almuerzo</dt>
                <dd className="mb-0">{plan.almuerzo}</dd>
              </dl>
            ) : (
              <Vacio icono="plan" titulo="Aún no tienes un plan asignado" />
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}

function InicioStaff({ esNutri = false }) {
  const hoy = hoyISO()
  const { data, cargando, error } = useApi(async () => {
    const [citas, pacientes] = await Promise.all([api.listarCitas({ desde: hoy, hasta: sumarDias(hoy, 14) }), api.listarPacientes()])
    return { citas, pacientes }
  })
  if (cargando) return <Cargando />
  if (error) return <ErrorApi error={error} />

  const deHoy = data.citas.filter((c) => c.fecha === hoy && c.estado !== ESTADOS_CITA.CANCELADA)
  const pendientes = data.citas.filter((c) => c.estado === ESTADOS_CITA.PENDIENTE)
  const reprogramar = pendientes.filter((c) => c.requiereReprogramacion)
  const confirmadasSemana = data.citas.filter((c) => c.estado === ESTADOS_CITA.CONFIRMADA && c.fecha <= sumarDias(hoy, 7))

  return (
    <div className="vstack gap-3">
      {reprogramar.length > 0 && (
        <Alerta tipo="advertencia">
          Hay {reprogramar.length} cita(s) que requieren reprogramación.{' '}
          <Link to="/agenda?estado=pendiente" className="alert-link">
            Revisar
          </Link>
        </Alerta>
      )}
      <div className="row row-cols-2 row-cols-lg-4 g-3">
        <Stat etiqueta="Citas de hoy" icono="calendario" valor={deHoy.length} />
        <Stat etiqueta="Solicitudes pendientes" icono="reloj" valor={pendientes.length} detalle="Por confirmar" />
        <Stat etiqueta="Confirmadas próximos 7 días" icono="check" valor={confirmadasSemana.length} />
        <Stat etiqueta={esNutri ? 'Mis pacientes' : 'Pacientes registrados'} icono="usuarios" valor={data.pacientes.length} />
      </div>
      <div className="row g-3">
        <div className="col-lg-6">
          <Tarjeta
            titulo="Agenda de hoy"
            accion={
              <Link to="/agenda" className="btn btn-outline-secondary btn-sm">
                Abrir agenda
              </Link>
            }
          >
            {deHoy.length ? (
              <ul className="list-group list-group-flush">
                {deHoy.map((c) => (
                  <ItemCita key={c.id} c={c} />
                ))}
              </ul>
            ) : (
              <Vacio icono="calendario" titulo="No hay citas para hoy" />
            )}
          </Tarjeta>
        </div>
        <div className="col-lg-6">
          <Tarjeta
            titulo="Solicitudes por confirmar"
            accion={
              <Link to="/agenda?estado=pendiente" className="btn btn-outline-secondary btn-sm">
                Gestionar
              </Link>
            }
          >
            {pendientes.length ? (
              <ul className="list-group list-group-flush">
                {pendientes.slice(0, 6).map((c) => (
                  <ItemCita key={c.id} c={c} />
                ))}
              </ul>
            ) : (
              <Vacio icono="check" titulo="Todo al día" />
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}

function InicioAdmin() {
  const hoy = hoyISO()
  const { data, cargando, error } = useApi(async () => {
    const [stats, proximas] = await Promise.all([api.estadisticas({ desde: sumarDias(hoy, -30), hasta: hoy }), api.listarCitas({ desde: hoy, hasta: sumarDias(hoy, 7) })])
    return { stats, proximas }
  })
  if (cargando) return <Cargando />
  if (error) return <ErrorApi error={error} />
  const { stats, proximas } = data
  const atendidas = stats.porEstado.find((e) => e.estado === ESTADOS_CITA.ATENDIDA).cantidad
  const usuarios = stats.usuariosPorRol.reduce((s, r) => s + r.cantidad, 0)

  const accesos = [
    ['/admin/usuarios', 'usuarios', 'Gestión de usuarios', 'Crear, editar, desactivar cuentas y asignar roles.'],
    ['/admin/reportes', 'grafico', 'Reportes y estadísticas', 'Atenciones por período, inasistencia y distribución por nutricionista.'],
  ]

  return (
    <div className="vstack gap-3">
      <div className="row row-cols-2 row-cols-lg-4 g-3">
        <Stat etiqueta="Usuarios activos" icono="usuarios" valor={usuarios} detalle={`${stats.pacientesActivos} pacientes`} />
        <Stat etiqueta="Atenciones (30 días)" icono="check" valor={atendidas} />
        <Stat etiqueta="Inasistencia (30 días)" icono="alerta" valor={`${Math.round(stats.tasaInasistencia * 100)} %`} />
        <Stat etiqueta="Citas próximos 7 días" icono="calendario" valor={proximas.filter((c) => c.estado !== ESTADOS_CITA.CANCELADA).length} />
      </div>
      <div className="row g-3">
        {accesos.map(([a, icono, titulo, texto]) => (
          <div className="col-lg-6" key={a}>
            <Link to={a} className="card shadow-sm h-100 text-decoration-none tarjeta-enlace">
              <div className="card-body d-flex gap-3 align-items-start">
                <Icono nombre={icono} tamano={28} className="text-success flex-shrink-0" />
                <div>
                  <h2 className="h6 mb-1">{titulo}</h2>
                  <p className="text-body-secondary mb-0">{texto}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
