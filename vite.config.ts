import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Relative base so built JS/CSS resolve on:
 * - Vercel root (https://*.vercel.app/)
 * - GitHub Pages subpath (/smart-plant-identification/)
 * Absolute `/smart-plant-identification/` caused 404 white screens on Vercel.
 */
export default defineConfig(({ mode }) => {
  // Load all .env keys for the Vite Node proxy only — never expose PLANTNET_* to the client.
  const env = loadEnv(mode, rootDir, '')
  const plantNetKey = (env.PLANTNET_API_KEY || process.env.PLANTNET_API_KEY || '').trim()

  const appBase =
    env.VITE_BASE_PATH?.trim() ||
    process.env.VITE_BASE_PATH?.trim() ||
    (process.env.VERCEL ? '/' : '/smart-plant-identification/')

  return {
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
     * to Pl@ntNet from the Vite Node server (no browser CORS, no client key).
     * Production uses `api/identify.js` with server env `PLANTNET_API_KEY`.
     */
    server: {
      proxy: {
        '/api/identify': {
          target: 'https://my-api.plantnet.org',
          changeOrigin: true,
          secure: true,
          rewrite: () => {
            if (!plantNetKey) {
              throw new Error(
                'Set PLANTNET_API_KEY in .env for local Vite proxy (server-only, not VITE_).',
              )
            }
            return `/v2/identify/all?api-key=${encodeURIComponent(plantNetKey)}&include-related-images=false&no-reject=true&lang=en`
          },
        },
      },
    },
  }
})
