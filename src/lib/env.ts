/**
 * Vite inlines `import.meta.env.VITE_*` at build time.
 * Access must use static property names (not dynamic keys) so values
 * are correctly embedded in the GitHub Pages production bundle.
 */

function normalizeEnvValue(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  // Guard against accidentally stringified empties from CI
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

/** Pl@ntNet API key — must remain a static `import.meta.env.VITE_PLANTNET_API_KEY` read. */
export function readPlantNetApiKey(): string | null {
  const key = normalizeEnvValue(import.meta.env.VITE_PLANTNET_API_KEY)
  if (!key || isPlaceholder(key)) return null
  return key
}

export function readSupabaseUrl(): string | null {
  const url = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL)
  if (!url || isPlaceholder(url)) return null
  return url
}

export function readSupabaseAnonKey(): string | null {
  const key = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY)
  if (!key || isPlaceholder(key)) return null
  return key
}

export function isProdBuild(): boolean {
  return import.meta.env.PROD === true
}

/** Arabic guidance when a VITE_* secret was not baked into the production bundle. */
export function missingEnvArabicMessage(varName: string): string {
  if (isProdBuild()) {
    return (
      `${varName} غير متوفر في نسخة النشر على GitHub Pages. ` +
      `أضف القيمة في GitHub → Settings → Secrets and variables → Actions، ` +
      `ثم أعد تشغيل workflow النشر (Deploy to GitHub Pages).`
    )
  }
  return (
    `${varName} غير مُعدّ محلياً. أضفه إلى ملف .env في جذر المشروع ثم أعد تشغيل npm run dev.`
  )
}
