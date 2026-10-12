import { Component } from 'react'
import Icono from './Icono'

// Evita que un error en una vista deje la aplicación en blanco
export default class LimiteError extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(prev) {
    if (prev.ruta !== this.props.ruta && this.state.error) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="d-flex flex-column align-items-center gap-3 text-center py-5 px-3">
        <Icono nombre="alerta" tamano={48} className="text-success" />
        <h1 className="h3 mb-0">Algo salió mal</h1>
        <p className="text-body-secondary mb-0">Ocurrió un error inesperado al mostrar esta sección.</p>
        <button className="btn btn-success" onClick={() => this.setState({ error: null })}>
          Reintentar
        </button>
      </div>
    )
  }
}
