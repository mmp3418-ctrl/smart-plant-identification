import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Load VITE_* from `.env` / process.env (CI secrets) and ensure they are
 * available for client bundling on GitHub Pages production builds.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_')

  const plantNetKey = (env.VITE_PLANTNET_API_KEY || process.env.VITE_PLANTNET_API_KEY || '').trim()
  const supabaseUrl = (env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const supabaseAnon = (
    env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim()

  return {
    base: '/smart-plant-identification/',
    envPrefix: 'VITE_',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    // Explicit defines as a safety net so CI-injected secrets are always inlined
    define: {
      'import.meta.env.VITE_PLANTNET_API_KEY': JSON.stringify(plantNetKey),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
    },
  }
})
