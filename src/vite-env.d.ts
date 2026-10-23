/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Optional override for the identify proxy (default `/api/identify`). */
  readonly VITE_IDENTIFY_API_URL?: string
  /** Local-dev only — production key lives in Vercel `PLANTNET_API_KEY`. */
  readonly VITE_PLANTNET_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
