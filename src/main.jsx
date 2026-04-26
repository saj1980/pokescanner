import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import PokemonScanner from '../pokemon-scanner.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PokemonScanner />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
