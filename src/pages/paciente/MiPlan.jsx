import { useApi } from '../../hooks/useApi'
import * as api from '../../services/api'
import { Cargando, EncabezadoPagina, ErrorApi, Vacio } from '../../components/ui'
import { PlanesAnteriores, VistaPlan } from '../../components/Clinico'
import Icono from '../../components/Icono'

export default function MiPlan() {
  const { data: planes, cargando, error } = useApi(async () => {
    const perfil = await api.miPerfilPaciente()
    return api.listarPlanes(perfil.id)
  })
  if (cargando) return <Cargando />
  if (error) return <ErrorApi error={error} />

  const vigente = planes.find((p) => p.vigente)

  return (
    <>
      <EncabezadoPagina titulo="Mi plan alimenticio" descripcion="Disponible siempre, aunque pierdas la hoja impresa.">
        {vigente && (
          <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 no-imprimir" onClick={() => window.print()}>
            <Icono nombre="ficha" tamano={18} /> Imprimir
          </button>
        )}
      </EncabezadoPagina>
      {vigente ? (
        <div className="vstack gap-3">
          <section className="card shadow-sm">
            <div className="card-body">
              <VistaPlan plan={vigente} />
            </div>
          </section>
          <PlanesAnteriores planes={planes.filter((p) => !p.vigente)} />
        </div>
      ) : (
        <Vacio icono="plan" titulo="Aún no tienes un plan alimenticio">
          Tu nutricionista lo creará después de tu evaluación.
        </Vacio>
      )}
    </>
  )
}
