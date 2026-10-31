import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Only activate CSS reveal animations when IntersectionObserver is available.
// Without this guard, .js-reveal hides .reveal elements globally and the hook
// in motion.tsx cannot add .in because the observer never fires.
if (typeof IntersectionObserver !== 'undefined') {
  document.documentElement.classList.add('js-reveal')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
