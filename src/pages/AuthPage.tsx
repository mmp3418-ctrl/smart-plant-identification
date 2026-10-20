import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'

export type AuthMode = 'login' | 'register'

interface AuthPageProps {
  /** Force a mode; otherwise read from ?mode= or default to login */
  initialMode?: AuthMode
}

export function AuthPage({ initialMode }: AuthPageProps) {
  const [searchParams] = useSearchParams()
  const paramMode = searchParams.get('mode')
  const mode: AuthMode =
    initialMode ??
    (paramMode === 'register' || paramMode === 'login' ? paramMode : 'login')

  const { login, register, isConfigured } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      if (isRegister) {
        await register({ name, email, password })
        navigate('/')
      } else {
        await login({ email, password })
        navigate('/')
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'فشلت عملية المصادقة.'

      // Email confirmation is a soft success path for signup
      if (
        isRegister &&
        message.includes('تم إنشاء الحساب')
      ) {
        setInfo(message)
        setError(null)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-app flex justify-center py-10 sm:py-14">
      <Card className="w-full max-w-md" glass padding="lg">
        <div className="mb-5 flex rounded-xl border border-white/30 dark:border-stone-700/55 p-1">
          <Link
            to="/login"
            className={cn(
              'flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors',
              !isRegister
                ? 'bg-brand text-white'
                : 'text-muted dark:text-stone-300 hover:text-ink dark:hover:text-stone-100',
            )}
          >
            دخول
          </Link>
          <Link
            to="/register"
            className={cn(
              'flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors',
              isRegister
                ? 'bg-brand text-white'
                : 'text-muted dark:text-stone-300 hover:text-ink dark:hover:text-stone-100',
            )}
          >
            حساب جديد
          </Link>
        </div>

        <h1 className="text-xl font-extrabold text-ink dark:text-stone-100">
          {isRegister ? 'إنشاء حساب' : 'تسجيل الدخول'}
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-stone-300">
          {isConfigured
            ? isRegister
              ? 'إنشاء حساب عبر Supabase مع مزامنة الملف الشخصي تلقائياً.'
              : 'الدخول عبر Supabase Auth.'
            : 'وضع محلي للتطوير — تُحفظ الجلسة في المتصفح فقط.'}
        </p>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-6 space-y-4"
        >
          {isRegister ? (
            <Input
              label="الاسم"
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="اسمك الكامل"
            />
          ) : null}

          <Input
            label="البريد الإلكتروني"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />
          <Input
            label="كلمة المرور"
            type="password"
            name="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint={isRegister ? '6 أحرف على الأقل' : undefined}
            placeholder="••••••••"
          />

          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          {info ? (
            <p
              role="status"
              className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand dark:text-emerald-300"
            >
              {info}
            </p>
          ) : null}

          <Button type="submit" fullWidth loading={loading}>
            {isRegister ? 'إنشاء الحساب' : 'دخول'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
