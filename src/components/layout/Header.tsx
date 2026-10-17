import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  Leaf,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Heart,
  History,
  LayoutDashboard,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'

const navLinks = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/identify', label: 'تعريف النبات' },
  { to: '/directory', label: 'دليل النباتات' },
] as const

export function Header() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex min-h-11 items-center px-3 text-sm font-medium transition-colors rounded-md',
      isActive
        ? 'bg-brand-soft text-brand'
        : 'text-muted hover:text-ink hover:bg-[color-mix(in_srgb,#EDF1E8_80%,#D5DDD2)]',
    )

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="container-app flex h-14 items-center justify-between gap-3 sm:h-16">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 shrink-0"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-brand text-white">
            <Leaf className="size-4" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="hidden sm:flex flex-col leading-none">
            <span className="text-sm font-bold text-ink">نبْتة</span>
            <span className="text-[11px] text-muted mt-0.5">تعريف وملاءمة بيئية</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5" aria-label="التنقل الرئيسي">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={'end' in link ? link.end : false}
              className={linkClass}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/identify">
            <Button size="sm" leftIcon={<Camera className="size-4" />}>
              التقط صورة
            </Button>
          </Link>

          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-ink hover:bg-canvas"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-sage text-brand-dark">
                  <User className="size-4" aria-hidden />
                </span>
                <span className="max-w-[100px] truncate font-medium">{user.name}</span>
                <ChevronDown
                  className={cn(
                    'size-4 text-muted transition-transform',
                    profileOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              {profileOpen ? (
                <div
                  role="menu"
                  className="absolute start-0 mt-1.5 w-56 rounded-lg border border-line bg-surface p-1.5 shadow-sm"
                >
                  <div className="border-b border-line px-3 py-2 mb-1">
                    <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                    <p className="text-xs text-muted truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/favorites"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm text-ink hover:bg-canvas"
                  >
                    <Heart className="size-4" aria-hidden />
                    المفضلة
                  </Link>
                  <Link
                    to="/history"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm text-ink hover:bg-canvas"
                  >
                    <History className="size-4" aria-hidden />
                    سجل التعريف
                  </Link>
                  {user.role === 'admin' ? (
                    <Link
                      to="/admin"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm text-ink hover:bg-canvas"
                    >
                      <LayoutDashboard className="size-4" aria-hidden />
                      لوحة الإدارة
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false)
                      void logout()
                    }}
                    className="flex w-full min-h-10 items-center gap-2 rounded-md px-3 text-sm text-danger hover:bg-danger-soft"
                  >
                    <LogOut className="size-4" aria-hidden />
                    تسجيل الخروج
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-muted hover:text-ink"
              >
                دخول
              </Link>
              <Link to="/register">
                <Button variant="outline" size="sm">
                  حساب جديد
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden touch-target inline-flex items-center justify-center rounded-md text-ink hover:bg-canvas"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-drawer"
          aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden transition-opacity duration-200',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-brand-dark/40"
          onClick={() => setMobileOpen(false)}
          aria-label="إغلاق القائمة"
        />
        <aside
          id="mobile-drawer"
          className={cn(
            'absolute top-14 inset-x-0 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-line bg-surface',
            'transition-transform duration-200',
            mobileOpen ? 'translate-y-0' : '-translate-y-2',
          )}
        >
          <nav className="flex flex-col gap-0.5 p-3" aria-label="تنقل الجوال">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={'end' in link ? link.end : false}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-4 py-3 text-base font-medium',
                    isActive ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-canvas',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/favorites"
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-4 py-3 text-base font-medium text-ink hover:bg-canvas"
            >
              المفضلة
            </Link>
            <Link
              to="/history"
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-4 py-3 text-base font-medium text-ink hover:bg-canvas"
            >
              سجل التعريف
            </Link>
          </nav>

          <div className="space-y-2 border-t border-line p-3">
            {user ? (
              <>
                <div className="rounded-md bg-canvas px-4 py-3">
                  <p className="text-sm font-semibold text-ink">{user.name}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>
                {user.role === 'admin' ? (
                  <Link to="/admin" onClick={() => setMobileOpen(false)}>
                    <Button variant="secondary" fullWidth>
                      لوحة الإدارة
                    </Button>
                  </Link>
                ) : null}
                <Button
                  variant="ghost"
                  fullWidth
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => {
                    setMobileOpen(false)
                    void logout()
                  }}
                >
                  تسجيل الخروج
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" fullWidth>
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <Button fullWidth>إنشاء حساب</Button>
                </Link>
              </>
            )}
          </div>
        </aside>
      </div>
    </header>
  )
}
