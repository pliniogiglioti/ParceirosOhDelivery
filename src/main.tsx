import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { App } from '@/App'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 2800,
        style: {
          borderRadius: '12px',
          background: '#182738',
          color: '#f8f5ef',
          padding: '14px 16px',
        },
      }}
    />
  </StrictMode>
)
