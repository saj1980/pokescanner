import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import PokemonScanner from '../pokemon-scanner.jsx'

inject()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PokemonScanner />
  </StrictMode>,
)
