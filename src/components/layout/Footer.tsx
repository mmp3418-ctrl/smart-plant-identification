import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { useSiteContent } from '@/context/ContentContext'

export function Footer() {
  const year = new Date().getFullYear()
  const { content } = useSiteContent()
  const footer = content.footer

  return (
    <footer className="mt-auto glass-panel border-t border-white/10">
      <div className="container-app py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md">
                <Leaf className="size-4" aria-hidden />
              </span>
              <span className="font-bold text-ink">{footer.brandName}</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              {footer.tagline}
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">
              {footer.linksTitle}
            </h3>
            <ul className="space-y-2">
              {footer.links.map((link) => (
                <li key={link.id}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted transition-colors duration-200 hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">
              {footer.disclaimerTitle}
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              {footer.disclaimer}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-1 border-t border-white/10 pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {footer.copyrightSuffix}
          </p>
          <p className="text-[11px]">{footer.englishLine}</p>
        </div>
      </div>
    </footer>
  )
}
