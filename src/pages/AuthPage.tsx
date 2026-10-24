import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useSiteContent } from '@/context/ContentContext'
import {
  passwordStrength,
  validateEmail,
  validateName,
  validatePassword,
} from '@/lib/authValidation'
import { fadeUp, scaleIn } from '@/lib/motion'
import { cn } from '@/lib/cn'

export type AuthMode = 'login' | 'register'

interface AuthPageProps {
  initialMode?: AuthMode
}

export function AuthPage({ initialMode }: AuthPageProps) {
  const [searchParams] = useSearchParams()
  const paramMode = searchParams.get('mode')
  const mode: AuthMode =
    initialMode ??
    (paramMode === 'register' || paramMode === 'login' ? paramMode : 'login')

  const { login, register, isConfigured } = useAuth()
  const { content } = useSiteContent()
  const copy = content.auth
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  const nameCheck = useMemo(() => validateName(name), [name])
  const emailCheck = useMemo(() => validateEmail(email), [email])
  const passwordCheck = useMemo(
    () => validatePassword(password, { isRegister }),
    [password, isRegister],
  )
  const strength = useMemo(() => passwordStrength(password), [password])

  const formValid =
    emailCheck.valid &&
    passwordCheck.valid &&
    password.length >= 6 &&
    (!isRegister || nameCheck.valid)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched({ name: true, email: true, password: true })

    if (!formValid) {
      setError('يرجى تصحيح الحقول المظللة قبل المتابعة.')
      return
    }

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

      if (isRegister && message.includes('تم إنشاء الحساب')) {
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
      <motion.div
        className="w-full max-w-md"
        variants={scaleIn}
        initial="hidden"
        animate="show"
      >
        <Card className="relative overflow-hidden glow-border" glass padding="lg">
          <div
            className="pointer-events-none absolute -top-24 start-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl"
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute -bottom-16 end-0 size-40 rounded-full bg-sage/40 blur-3xl float-soft"
            aria-hidden
          />

          <div className="relative mb-5 flex rounded-xl border border-line/80 bg-canvas/60 p-1 dark:bg-brand-dark/40">
            <Link
              to="/login"
              className={cn(
                'flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all duration-200',
                !isRegister
                  ? 'bg-brand text-white shadow-md'
                  : 'text-muted hover:text-ink',
              )}
            >
              {copy.loginTab}
            </Link>
            <Link
              to="/register"
              className={cn(
                'flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all duration-200',
                isRegister
                  ? 'bg-brand text-white shadow-md'
                  : 'text-muted hover:text-ink',
              )}
            >
              {copy.registerTab}
            </Link>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8 }}
            >
              <h1 className="relative text-xl font-extrabold text-ink">
                {isRegister ? copy.registerTitle : copy.loginTitle}
              </h1>
              <p className="relative mt-1 text-sm text-muted">
                {isConfigured
                  ? isRegister
                    ? copy.registerSubtitle
                    : copy.loginSubtitle
                  : copy.localModeHint}
              </p>
            </motion.div>
          </AnimatePresence>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="relative mt-6 space-y-4"
            noValidate
          >
            {isRegister ? (
              <Input
                label={copy.nameLabel}
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                placeholder={copy.namePlaceholder}
                leftAddon={<UserRound className="size-4" />}
                error={
                  touched.name && !nameCheck.valid
                    ? nameCheck.message ?? undefined
                    : undefined
                }
              />
            ) : null}

            <Input
              label={copy.emailLabel}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder={copy.emailPlaceholder}
              leftAddon={<Mail className="size-4" />}
              error={
                touched.email && !emailCheck.valid
                  ? emailCheck.message ?? undefined
                  : undefined
              }
            />

            <div>
              <Input
                label={copy.passwordLabel}
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                hint={!touched.password ? copy.passwordHint : undefined}
                placeholder={copy.passwordPlaceholder}
                leftAddon={<Lock className="size-4" />}
                rightAddon={
                  <button
                    type="button"
                    className="touch-target inline-flex items-center justify-center text-muted hover:text-brand"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                }
                error={
                  touched.password && !passwordCheck.valid
                    ? passwordCheck.message ?? undefined
                    : undefined
                }
                success={
                  touched.password &&
                  passwordCheck.valid &&
                  passwordCheck.message
                    ? passwordCheck.message
                    : undefined
                }
              />

              {isRegister && password ? (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((level) => (
                      <span
                        key={level}
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-colors',
                          strength.score >= level
                            ? level === 1
                              ? 'bg-danger'
                              : level === 2
                                ? 'bg-warning'
                                : 'bg-brand'
                            : 'bg-line',
                        )}
                      />
                    ))}
                  </div>
                  {strength.label ? (
                    <p className="text-[11px] text-muted">
                      قوة كلمة المرور: {strength.label}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <AnimatePresence>
              {error ? (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
                >
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {info ? (
                <motion.p
                  role="status"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-brand/25 bg-brand-soft px-3 py-2 text-sm text-brand"
                >
                  {info}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <Button type="submit" fullWidth loading={loading}>
              {isRegister ? copy.registerSubmit : copy.loginSubmit}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
