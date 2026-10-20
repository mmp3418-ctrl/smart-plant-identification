import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

/** Mirrors `src/config/publicRuntimeConfig.ts` for Node-side Vite defines. */
const PUBLIC_FALLBACKS = {
  VITE_PLANTNET_API_KEY: '2b10d9WpUNeMmsuwvO7MLBaUu',
  VITE_SUPABASE_URL: 'https://xfyhmzlzpztitaecdoqj.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_1NbiZ3cxFkINQs0ZT4GcXQ_Uc3R3wzL',
} as const

function resolveViteEnv(
  env: Record<string, string>,
  name: keyof typeof PUBLIC_FALLBACKS,
): string {
  const fromFiles = (env[name] || process.env[name] || '').trim()
  if (
    fromFiles &&
    !fromFiles.toLowerCase().includes('your-') &&
    fromFiles !== 'undefined'
  ) {
    return fromFiles
  }
  return PUBLIC_FALLBACKS[name]
}

/**
 * Always inline VITE_* into the client bundle (env/secrets OR public fallbacks)
 * so GitHub Pages works even when `.env` is not present in CI.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_')

  const plantNetKey = resolveViteEnv(env, 'VITE_PLANTNET_API_KEY')
  const supabaseUrl = resolveViteEnv(env, 'VITE_SUPABASE_URL')
  const supabaseAnon = resolveViteEnv(env, 'VITE_SUPABASE_ANON_KEY')

  return {
    base: '/smart-plant-identification/',
    envPrefix: 'VITE_',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    define: {
      'import.meta.env.VITE_PLANTNET_API_KEY': JSON.stringify(plantNetKey),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
    },
  }
})
