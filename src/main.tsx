import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Pedirle al navegador que no borre los datos locales cuando falte espacio
// (sin esto, Safari puede borrarlos tras semanas sin usar la página).
navigator.storage?.persist?.().catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
