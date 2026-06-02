import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development, proxy all /api requests to the Express backend.
    // This is needed because the empty VITE_API_URL fallback means the
    // frontend uses relative paths (/api/...) — Vite's dev server handles
    // forwarding them to the backend automatically.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
