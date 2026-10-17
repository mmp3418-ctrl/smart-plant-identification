import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'

export function RegisterPage() {
  const { register, isConfigured } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ name, email, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-app flex justify-center py-10 sm:py-14">
      <Card className="w-full max-w-md" padding="lg">
        <h1 className="text-xl font-extrabold text-ink">إنشاء حساب</h1>
        <p className="mt-1 text-sm text-muted">
          {isConfigured
            ? 'سيتم إنشاء الحساب عبر Supabase Auth.'
            : 'وضع محلي للتطوير — يُحفظ الحساب في المتصفح فقط.'}
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          <Input
            label="الاسم"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="اسمك الكامل"
          />
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="6 أحرف على الأقل"
            placeholder="••••••••"
          />

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Button type="submit" fullWidth loading={loading}>
            إنشاء الحساب
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          لديك حساب؟{' '}
          <Link to="/login" className="font-semibold text-brand hover:text-brand-dark">
            تسجيل الدخول
          </Link>
        </p>
      </Card>
    </div>
  )
}
