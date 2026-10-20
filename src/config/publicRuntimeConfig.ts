/**
 * Public client-side defaults for GitHub Pages builds.
 *
 * `.env` is gitignored and GitHub Actions secrets may be unset.
 * These values are intentionally embeddable in the frontend bundle
 * (Pl@ntNet project key + Supabase anon/publishable key).
 *
 * Prefer `import.meta.env.VITE_*` when present; these are fallbacks only.
 */
export const PUBLIC_RUNTIME_CONFIG = {
  plantNetApiKey: '2b10d9WpUNeMmsuwvO7MLBaUu',
  supabaseUrl: 'https://xfyhmzlzpztitaecdoqj.supabase.co',
  supabaseAnonKey: 'sb_publishable_1NbiZ3cxFkINQs0ZT4GcXQ_Uc3R3wzL',
} as const
