import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { z } from 'zod'
import { fr } from 'zod/locales'
import { installFrenchValidation } from './utils/frenchValidation'
import './index.css'
import App from './App'

z.config(fr())
const removeFrenchValidation = installFrenchValidation()
if (import.meta.hot) import.meta.hot.dispose(removeFrenchValidation)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
