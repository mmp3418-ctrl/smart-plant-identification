import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'

export function LoginPage() {
  const { login, isConfigured } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-app flex justify-center py-10 sm:py-14">
      <Card className="w-full max-w-md" padding="lg">
        <h1 className="text-xl font-extrabold text-ink">تسجيل الدخول</h1>
        <p className="mt-1 text-sm text-muted">
          {isConfigured
            ? 'الدخول عبر حساب Supabase المرتبط بالمشروع.'
            : 'وضع محلي للتطوير — أي بريد وكلمة مرور يعملان. استخدم بريداً يحتوي admin لصلاحيات الإدارة.'}
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Button type="submit" fullWidth loading={loading}>
            دخول
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="font-semibold text-brand hover:text-brand-dark">
            إنشاء حساب
          </Link>
        </p>
      </Card>
    </div>
  )
}
