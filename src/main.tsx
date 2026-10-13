import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Pedirle al navegador que no borre los datos locales cuando falte espacio
// (sin esto, Safari puede borrarlos tras semanas sin usar la página).
navigator.storage?.persist?.().catch(() => undefined)

// Actualizaciones: cuando se publica una versión nueva, la app la toma sola y recarga la página
// (los datos del productor no se tocan). También busca versiones nuevas cada vez que se vuelve a abrir.
if ('serviceWorker' in navigator) {
  let recargando = false
  const yaHabiaVersion = !!navigator.serviceWorker.controller // en la primera visita no hace falta recargar
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando || !yaHabiaVersion) return
    recargando = true
    window.location.reload()
  })
  const buscarActualizacion = () =>
    navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => undefined)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') buscarActualizacion() })
  window.addEventListener('focus', buscarActualizacion)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
