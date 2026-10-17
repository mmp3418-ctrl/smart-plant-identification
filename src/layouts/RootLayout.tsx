import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { cn } from '@/lib/cn'

export function RootLayout() {
  const { pathname } = useLocation()
  const isIdentify = pathname.startsWith('/identify')

  return (
    <div className="flex min-h-dvh flex-col">
      {!isIdentify ? <Header /> : null}
      <main className={cn('flex-1', isIdentify && 'bg-brand-dark')}>
        <Outlet />
      </main>
      {!isIdentify ? <Footer /> : null}
    </div>
  )
}
