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
})
