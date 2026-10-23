/**
 * Vite inlines `import.meta.env.VITE_*` at build time from `.env` / CI secrets.
 * Never hardcode API keys in source — use environment variables only.
 */

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
    lower.includes('your-plant-id') ||
    lower.startsWith('your-')
  )
}

function readEnv(value: unknown): string {
  const normalized = normalizeEnvValue(value)
  if (!normalized || isPlaceholder(normalized)) return ''
  return normalized
}

/**
 * Optional client-side Pl@ntNet key (local Vite proxy only).
 * Production identify calls use server env `PLANTNET_API_KEY` via `/api/identify`.
 */
export function readPlantNetApiKey(): string {
  return readEnv(import.meta.env.VITE_PLANTNET_API_KEY)
}

export function readSupabaseUrl(): string {
  return readEnv(import.meta.env.VITE_SUPABASE_URL)
}

export function readSupabaseAnonKey(): string {
  return readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function isProdBuild(): boolean {
  return import.meta.env.PROD === true
}

export function missingEnvArabicMessage(varName: string): string {
  if (isProdBuild()) {
    return `${varName} غير متوفر. أضفه كـ GitHub Actions secret ثم أعد النشر.`
  }
  return `${varName} غير مُعدّ. أضفه إلى ملف .env ثم أعد تشغيل npm run dev.`
}
