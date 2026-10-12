import { useApi } from '../../hooks/useApi'
import * as api from '../../services/api'
import { Cargando, EncabezadoPagina, ErrorApi, Vacio } from '../../components/ui'
import { GraficoProgreso, ResumenProgreso, TablaMediciones } from '../../components/Clinico'

export default function MiProgreso() {
  const { data: mediciones, cargando, error } = useApi(async () => {
    const perfil = await api.miPerfilPaciente()
    return api.listarMediciones(perfil.id)
  })
  if (cargando) return <Cargando />
  if (error) return <ErrorApi error={error} />

  return (
    <>
      <EncabezadoPagina titulo="Mi progreso" descripcion="Historial de las mediciones registradas por tu nutricionista en cada control." />
      {mediciones.length ? (
        <div className="vstack gap-3">
          <ResumenProgreso mediciones={mediciones} />
          <GraficoProgreso mediciones={mediciones} />
          <section className="card shadow-sm">
            <div className="card-header bg-body py-3">
              <h2 className="h6 mb-0">Historial de mediciones</h2>
            </div>
            <TablaMediciones mediciones={mediciones} />
          </section>
        </div>
      ) : (
        <Vacio icono="progreso" titulo="Aún no tienes mediciones">
          Tu nutricionista las registrará en tu primera consulta.
        </Vacio>
      )}
    </>
  )
}
