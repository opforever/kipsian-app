import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The KIPS API does not send Access-Control-Allow-Origin, so the browser can never
// talk to it directly from a Vercel domain. Everything goes through /api/proxy/*
// (a Vite dev proxy locally, a serverless function on Vercel).
const LEGACY_KEY = process.env.KIPS_API_KEY ?? 'fDK9T1qraRbT3cQtL8NZyovMNAy7jwQY'
// dev-only: point the proxy at a mock or a staging API (KIPS_API_TARGET=http://127.0.0.1:8787)
const API_TARGET = process.env.KIPS_API_TARGET ?? 'https://students.kips.edu.pk/api/v1'
const LEGACY_TARGET = process.env.KIPS_LEGACY_TARGET ?? 'https://377.kips.edu.pk/apis/portal/students'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api/proxy/v1': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/proxy\/v1/, ''),
      },
      '/api/proxy/legacy': {
        target: LEGACY_TARGET,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/proxy\/legacy/, ''),
        headers: { 'X-API-KEY': LEGACY_KEY },
      },
    },
  },
})