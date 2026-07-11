import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { InstallGate } from './components/InstallGate.tsx'
import { LanguagePicker } from './components/LanguagePicker.tsx'
import { LanguageProvider, loadLang } from './i18n/LanguageContext.tsx'

function Root() {
  const [languageChosen, setLanguageChosen] = useState(() => loadLang() !== null)

  if (!languageChosen) {
    return <LanguagePicker onChoose={() => setLanguageChosen(true)} />
  }

  return (
    <InstallGate>
      <App />
    </InstallGate>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <Root />
    </LanguageProvider>
  </StrictMode>,
)
