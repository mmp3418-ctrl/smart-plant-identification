/**
 * Vite inlines `import.meta.env.VITE_*` at build time.
 * Access must use static property names so values embed in the GH Pages bundle.
 *
 * When env vars are missing (common on GitHub Pages), we fall back to
 * `PUBLIC_RUNTIME_CONFIG` so identification keeps working.
 */
import { PUBLIC_RUNTIME_CONFIG } from '@/config/publicRuntimeConfig'

function normalizeEnvValue(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (
    trimmed === '' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === '""' ||
    trimmed === "''"
  ) {
    return ''
  }
  return trimmed
}

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase()
  return (
    lower.includes('your-project') ||
    lower.includes('your-anon-key') ||
    lower.includes('your-plantnet') ||
    lower === 'your-plantnet-api-key' ||
    lower.startsWith('your-')
  )
}

function resolveKey(envValue: unknown, fallback: string): string {
  const fromEnv = normalizeEnvValue(envValue)
  if (fromEnv && !isPlaceholder(fromEnv)) return fromEnv
  return fallback
}

/** Pl@ntNet API key — env first, then committed public fallback for GH Pages. */
export function readPlantNetApiKey(): string {
  return resolveKey(
    import.meta.env.VITE_PLANTNET_API_KEY,
    PUBLIC_RUNTIME_CONFIG.plantNetApiKey,
  )
}

export function readSupabaseUrl(): string {
  return resolveKey(
    import.meta.env.VITE_SUPABASE_URL,
    PUBLIC_RUNTIME_CONFIG.supabaseUrl,
  )
}

export function readSupabaseAnonKey(): string {
  return resolveKey(
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    PUBLIC_RUNTIME_CONFIG.supabaseAnonKey,
  )
}

export function isProdBuild(): boolean {
  return import.meta.env.PROD === true
}

/** Kept for rare misconfiguration paths — key should normally always resolve. */
export function missingEnvArabicMessage(varName: string): string {
  if (isProdBuild()) {
    return (
      `${varName} غير متوفر. تحقق من إعدادات النشر أو أعد بناء المشروع.`
    )
  }
  return (
    `${varName} غير مُعدّ. أضفه إلى ملف .env ثم أعد تشغيل npm run dev.`
  )
}
