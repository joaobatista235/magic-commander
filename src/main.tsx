import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { supabase } from './lib/supabase.ts'
import { useAuthStore } from './stores/authStore.ts'

supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})
