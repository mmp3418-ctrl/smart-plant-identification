import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
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
  LogIn,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { PlantSearchField } from '@/components/plants/PlantSearchField'
import { ThemeToggle } from '@/components/system/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'

const navLinks = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/identify', label: 'تعريف النبات' },
  { to: '/directory', label: 'دليل النباتات' },
] as const

export function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMobileOpen(false)
    setProfileOpen(false)
  }, [location.pathname, location.search])

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
      'inline-flex min-h-11 items-center px-3 text-sm font-medium transition-all duration-200 rounded-xl',
      isActive
        ? 'bg-brand-soft text-brand dark:text-emerald-300'
        : 'text-muted dark:text-stone-300 hover:text-ink dark:hover:text-stone-100 hover:bg-brand-soft/50',
    )

  return (
    <header className="sticky top-0 z-50 glass-panel">
      <div className="container-app flex h-14 items-center justify-between gap-3 sm:h-16">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 shrink-0 transition-transform duration-200 hover:scale-[1.02]"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
            <Leaf className="size-4" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="hidden sm:flex flex-col leading-none">
            <span className="text-sm font-bold text-ink dark:text-stone-100">نبْتة</span>
            <span className="mt-0.5 text-[11px] text-muted dark:text-stone-300">
              تعريف وملاءمة بيئية
            </span>
          </span>
        </Link>

        <nav
          className="hidden md:flex items-center gap-0.5"
          aria-label="التنقل الرئيسي"
        >
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
          <ThemeToggle />
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
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm text-ink dark:text-stone-100 transition-colors hover:bg-brand-soft/50"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="flex size-8 items-center justify-center rounded-xl bg-sage text-brand-dark dark:bg-emerald-900 dark:text-emerald-200">
                  <User className="size-4" aria-hidden />
                </span>
                <span className="max-w-[100px] truncate font-medium text-ink dark:text-stone-100">
                  {user.name}
                </span>
                <ChevronDown
                  className={cn(
                    'size-4 text-muted dark:text-stone-300 transition-transform duration-200',
                    profileOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              {profileOpen ? (
                <div
                  role="menu"
                  className="absolute start-0 mt-1.5 w-56 rounded-2xl glass-strong p-1.5"
                >
                  <div className="mb-1 border-b border-white/20 dark:border-stone-700/55 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-ink dark:text-stone-100">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-muted dark:text-stone-300">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    to="/favorites"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-ink dark:text-stone-100 transition-colors hover:bg-brand-soft/60"
                  >
                    <Heart className="size-4" aria-hidden />
                    المفضلة
                  </Link>
                  <Link
                    to="/history"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-ink dark:text-stone-100 transition-colors hover:bg-brand-soft/60"
                  >
                    <History className="size-4" aria-hidden />
                    سجل التعريف
                  </Link>
                  {user.role === 'admin' ? (
                    <Link
                      to="/admin"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-ink dark:text-stone-100 transition-colors hover:bg-brand-soft/60"
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
                    className="flex w-full min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-danger transition-colors hover:bg-danger-soft"
                  >
                    <LogOut className="size-4" aria-hidden />
                    تسجيل الخروج
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" size="sm">
                  دخول
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">حساب جديد</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="touch-target inline-flex items-center justify-center rounded-xl text-ink dark:text-stone-100 transition-colors hover:bg-brand-soft/50"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer"
            aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden transition-opacity duration-200',
          mobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-brand-dark/45 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
          aria-label="إغلاق القائمة"
        />

        <aside
          id="mobile-drawer"
          className={cn(
            'absolute top-14 inset-x-0 max-h-[calc(100dvh-3.5rem)] overflow-y-auto',
            'glass-strong',
            'transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-y-0' : '-translate-y-3',
          )}
        >
          {/* Search — separated from auth actions */}
          <div className="border-b border-white/20 dark:border-stone-700/55 px-4 pb-4 pt-3">
            <PlantSearchField
              placeholder="ابحث عن نبات…"
              navigateOnSubmit
            />
          </div>

          <nav className="flex flex-col gap-1 p-3" aria-label="تنقل الجوال">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={'end' in link ? link.end : false}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'min-h-11 rounded-xl px-4 py-3 text-base font-medium transition-colors',
                    isActive
                      ? 'bg-brand-soft text-brand dark:text-emerald-300'
                      : 'text-ink dark:text-stone-100 hover:bg-brand-soft/50',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/favorites"
              onClick={() => setMobileOpen(false)}
              className="min-h-11 rounded-xl px-4 py-3 text-base font-medium text-ink dark:text-stone-100 transition-colors hover:bg-brand-soft/50"
            >
              المفضلة
            </Link>
            <Link
              to="/history"
              onClick={() => setMobileOpen(false)}
              className="min-h-11 rounded-xl px-4 py-3 text-base font-medium text-ink dark:text-stone-100 transition-colors hover:bg-brand-soft/50"
            >
              سجل التعريف
            </Link>
          </nav>

          <div className="border-t border-white/20 dark:border-stone-700/55 p-4">
            <div className="mb-4">
              <ThemeToggle showLabel className="w-full justify-start" />
            </div>

            {user ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl glass-panel px-4 py-3">
                  <p className="text-sm font-semibold text-ink dark:text-stone-100">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted dark:text-stone-300">{user.email}</p>
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
                  className="min-h-11 text-danger hover:bg-danger-soft"
                  onClick={() => {
                    setMobileOpen(false)
                    void logout()
                  }}
                >
                  تسجيل الخروج
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block"
                >
                  <Button
                    variant="outline"
                    fullWidth
                    className="min-h-12 rounded-xl"
                    leftIcon={<LogIn className="size-4" />}
                  >
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block"
                >
                  <Button
                    fullWidth
                    className="min-h-12 rounded-xl"
                    leftIcon={<UserPlus className="size-4" />}
                  >
                    إنشاء حساب
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </header>
  )
}
