import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TronShowroomProvider } from './theme/TronShowroomContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TronShowroomProvider>
      <App />
    </TronShowroomProvider>
  </StrictMode>,
)
