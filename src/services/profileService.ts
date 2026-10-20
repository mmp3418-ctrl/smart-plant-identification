import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { ServiceError } from '@/services/errors'
import { translateAuthError } from '@/services/authMessages'
import type { UserRole } from '@/types/auth'
import type { DbProfileRow } from '@/types/userData'

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new ServiceError(
      'خدمة المصادقة غير مُعدّة. تحقق من مفاتيح Supabase.',
      'MISSING_SUPABASE',
    )
  }
  return supabase
}

function normalizeRole(value: string | null | undefined): UserRole {
  return value === 'admin' ? 'admin' : 'user'
}

export async function fetchProfile(userId: string): Promise<DbProfileRow | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, avatar_url, updated_at, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[profile] fetch:', error.message)
    return null
  }

  return data as DbProfileRow | null
}

/**
 * Create or update the profiles row for the authenticated user.
 */
export async function upsertProfileFromAuthUser(
  authUser: User,
  fullName?: string,
): Promise<DbProfileRow | null> {
  const client = requireClient()
  const nameFromMeta =
    (authUser.user_metadata?.name as string | undefined)?.trim() ||
    (authUser.user_metadata?.full_name as string | undefined)?.trim()
  const roleFromMeta = normalizeRole(
    authUser.user_metadata?.role as string | undefined,
  )

  const payload = {
    id: authUser.id,
    email: authUser.email ?? null,
    full_name: fullName?.trim() || nameFromMeta || authUser.email?.split('@')[0] || 'مستخدم',
    role: roleFromMeta,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, full_name, email, role, avatar_url, updated_at, created_at')
    .maybeSingle()

  if (error) {
    console.warn('[profile] upsert:', error.message)
    throw new ServiceError(
      translateAuthError(error.message) ||
        'تعذّر مزامنة الملف الشخصي. حاول مرة أخرى.',
      'API_ERROR',
    )
  }

  return data as DbProfileRow | null
}

export function profileDisplayName(
  profile: DbProfileRow | null,
  fallbackEmail: string,
): string {
  return profile?.full_name?.trim() || fallbackEmail.split('@')[0] || 'مستخدم'
}

export function profileRole(profile: DbProfileRow | null): UserRole {
  return normalizeRole(profile?.role)
}
