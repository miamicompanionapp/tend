import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { InstallGate } from './components/InstallGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InstallGate>
      <App />
    </InstallGate>
  </StrictMode>,
)
