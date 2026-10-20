import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readSupabaseAnonKey, readSupabaseUrl } from '@/lib/env'

const supabaseUrl = readSupabaseUrl()
const supabaseAnonKey = readSupabaseAnonKey()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null
