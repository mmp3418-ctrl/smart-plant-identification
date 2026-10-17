import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { readJson, removeKey, writeJson } from '@/services/storage'
import type { AppUser, AuthCredentials, RegisterPayload } from '@/types/auth'

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

function mapLocalUser(payload: RegisterPayload | AuthCredentials, name?: string): AppUser {
  const email = payload.email.trim().toLowerCase()
  return {
    id: `local-${btoa(email).replace(/=+/g, '')}`,
    name: name?.trim() || email.split('@')[0] || 'مستخدم',
    email,
    role: email.includes('admin') ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession()
        if (!active) return

        const sessionUser = data.session?.user
        if (sessionUser) {
          setUser({
            id: sessionUser.id,
            name:
              (sessionUser.user_metadata?.name as string | undefined) ||
              sessionUser.email?.split('@')[0] ||
              'مستخدم',
            email: sessionUser.email ?? '',
            role:
              (sessionUser.user_metadata?.role as AppUser['role'] | undefined) ||
              'user',
            createdAt: sessionUser.created_at,
          })
        }
      } else {
        setUser(readJson<AppUser | null>(LOCAL_USER_KEY, null))
      }

      if (active) setLoading(false)
    }

    void bootstrap()

    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          setUser(null)
          return
        }

        setUser({
          id: session.user.id,
          name:
            (session.user.user_metadata?.name as string | undefined) ||
            session.user.email?.split('@')[0] ||
            'مستخدم',
          email: session.user.email ?? '',
          role:
            (session.user.user_metadata?.role as AppUser['role'] | undefined) ||
            'user',
          createdAt: session.user.created_at,
        })
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
      throw new Error('يرجى إدخال البريد وكلمة المرور')
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      })
      if (error) throw new Error(error.message)
      return
    }

    const localUser = mapLocalUser(credentials)
    writeJson(LOCAL_USER_KEY, localUser)
    setUser(localUser)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    if (!payload.name.trim() || !payload.email.trim() || !payload.password) {
      throw new Error('يرجى تعبئة جميع الحقول')
    }
    if (payload.password.length < 6) {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signUp({
        email: payload.email.trim(),
        password: payload.password,
        options: {
          data: { name: payload.name.trim(), role: 'user' },
        },
      })
      if (error) throw new Error(error.message)
      return
    }

    const localUser = mapLocalUser(payload, payload.name)
    writeJson(LOCAL_USER_KEY, localUser)
    setUser(localUser)
  }, [])

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
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
