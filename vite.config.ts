import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vite loads `VITE_*` from `.env` / process env automatically.
 * Do not hardcode secrets here — use `.env` locally and GitHub Actions secrets in CI.
 */
export default defineConfig({
  base: '/smart-plant-identification/',
  envPrefix: 'VITE_',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  /**
   * Local-dev stand-in for Vercel `/api/identify` — proxies FormData POST
   * to Pl@ntNet from the Vite Node server (no browser CORS).
   * Production uses the real Vercel serverless function instead.
   */
  server: {
    proxy: {
      '/api/identify': {
        target: 'https://my-api.plantnet.org',
        changeOrigin: true,
        secure: true,
        rewrite: () => {
          const key =
            process.env.PLANTNET_API_KEY ||
            process.env.VITE_PLANTNET_API_KEY ||
            '2b10dRfDh71QvSzCP4smdtYoZe'
          return `/v2/identify/all?api-key=${encodeURIComponent(key)}&include-related-images=false&no-reject=true&lang=en`
        },
      },
    },
  },
})
