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
/**
 * Relative base so built JS/CSS resolve on:
 * - Vercel root (https://*.vercel.app/)
 * - GitHub Pages subpath (/smart-plant-identification/)
 * Absolute `/smart-plant-identification/` caused 404 white screens on Vercel.
 */
const appBase =
  process.env.VITE_BASE_PATH?.trim() ||
  (process.env.VERCEL ? '/' : '/smart-plant-identification/')

export default defineConfig({
  base: appBase,
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
          // Server-side only during `npm run dev` — never shipped to the browser
          const key = (
            process.env.PLANTNET_API_KEY ||
            process.env.VITE_PLANTNET_API_KEY ||
            ''
          ).trim()
          if (!key) {
            throw new Error(
              'Set PLANTNET_API_KEY (or VITE_PLANTNET_API_KEY) in .env for local Vite proxy.',
            )
          }
          return `/v2/identify/all?api-key=${encodeURIComponent(key)}&include-related-images=false&no-reject=true&lang=en`
        },
      },
    },
  },
})
