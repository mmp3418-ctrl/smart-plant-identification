import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { translateAuthError } from '@/services/authMessages'
import {
  fetchProfile,
  profileDisplayName,
  profileRole,
  upsertProfileFromAuthUser,
} from '@/services/profileService'
import { readJson, removeKey, writeJson } from '@/services/storage'
import type { AppUser, AuthCredentials, RegisterPayload } from '@/types/auth'
import type { DbProfileRow } from '@/types/userData'

const LOCAL_USER_KEY = 'spi.auth.user'

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  isConfigured: boolean
  login: (credentials: AuthCredentials) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapLocalUser(
  payload: RegisterPayload | AuthCredentials,
  name?: string,
): AppUser {
  const email = payload.email.trim().toLowerCase()
  return {
    id: `local-${btoa(unescape(encodeURIComponent(email))).replace(/=+/g, '')}`,
    name: name?.trim() || email.split('@')[0] || 'مستخدم',
    email,
    role: email.includes('admin') ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  }
}

function toAppUser(authUser: User, profile: DbProfileRow | null): AppUser {
  return {
    id: authUser.id,
    name: profileDisplayName(profile, authUser.email ?? ''),
    email: profile?.email?.trim() || authUser.email || '',
    role: profileRole(profile),
    createdAt: profile?.created_at || authUser.created_at,
  }
}

async function syncUserFromSession(session: Session | null): Promise<AppUser | null> {
  if (!session?.user) return null

  let profile = await fetchProfile(session.user.id)
  if (!profile) {
    profile = await upsertProfileFromAuthUser(session.user)
  }

  return toAppUser(session.user, profile)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession()
          if (!active) return
          const next = await syncUserFromSession(data.session)
          if (active) setUser(next)
        } else {
          setUser(readJson<AppUser | null>(LOCAL_USER_KEY, null))
        }
      } catch (error) {
        console.warn('[auth] bootstrap:', error)
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    void bootstrap()

    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        void (async () => {
          try {
            const next = await syncUserFromSession(session)
            if (active) setUser(next)
          } catch (error) {
            console.warn('[auth] state change:', error)
            if (active) {
              setUser(
                session?.user
                  ? toAppUser(session.user, null)
                  : null,
              )
            }
          }
        })()
      })

      return () => {
        active = false
        subscription.unsubscribe()
      }
    }

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials: AuthCredentials) => {
    if (!credentials.email.trim() || !credentials.password) {
      throw new Error('يرجى إدخال البريد الإلكتروني وكلمة المرور.')
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      })
      if (error) throw new Error(translateAuthError(error.message))

      if (data.user) {
        const profile = await upsertProfileFromAuthUser(data.user)
        setUser(toAppUser(data.user, profile))
      }
      return
    }

    const localUser = mapLocalUser(credentials)
    writeJson(LOCAL_USER_KEY, localUser)
    setUser(localUser)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    if (!payload.name.trim() || !payload.email.trim() || !payload.password) {
      throw new Error('يرجى تعبئة جميع الحقول.')
    }
    if (payload.password.length < 6) {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل.')
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email.trim(),
        password: payload.password,
        options: {
          data: {
            name: payload.name.trim(),
            full_name: payload.name.trim(),
            role: 'user',
          },
        },
      })
      if (error) throw new Error(translateAuthError(error.message))

      if (data.user) {
        await upsertProfileFromAuthUser(data.user, payload.name.trim())
      }

      if (!data.session || !data.user) {
        throw new Error(
          'تم إنشاء الحساب بنجاح. يرجى تأكيد البريد الإلكتروني ثم تسجيل الدخول.',
        )
      }

      const profile = await fetchProfile(data.user.id)
      setUser(toAppUser(data.user, profile))
      return
    }

    const localUser = mapLocalUser(payload, payload.name)
    writeJson(LOCAL_USER_KEY, localUser)
    setUser(localUser)
  }, [])

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) throw new Error(translateAuthError(error.message))
    }
    removeKey(LOCAL_USER_KEY)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isConfigured: isSupabaseConfigured,
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth يجب استخدامه داخل AuthProvider')
  }
  return context
}
