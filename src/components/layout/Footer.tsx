import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'

const links = [
  { to: '/', label: 'الرئيسية' },
  { to: '/identify', label: 'تعريف النبات' },
  { to: '/directory', label: 'دليل النباتات' },
  { to: '/about', label: 'عن المشروع' },
] as const

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto glass-panel">
      <div className="container-app py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-brand text-white">
                <Leaf className="size-4" aria-hidden />
              </span>
              <span className="font-bold text-ink dark:text-stone-100">نبْتة</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted dark:text-stone-300">
              منصة عربية لتعريف النباتات من الصور وتقديم معلومات العناية
              والملاءمة البيئية — مشروع تخرج جامعي لأغراض تعليمية وبحثية.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-ink dark:text-stone-100">
              روابط
            </h3>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted dark:text-stone-300 transition-colors duration-200 hover:text-brand dark:hover:text-emerald-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-ink dark:text-stone-100">
              إخلاء مسؤولية
            </h3>
            <p className="text-sm leading-relaxed text-muted dark:text-stone-300">
              النتائج إرشادية وليست بديلاً عن الاستشارة الزراعية المتخصصة أو
              الدراسات الميدانية المعتمدة. استخدم المعلومات بحذر وفي سياق تعليمي.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-1 border-t border-white/20 dark:border-stone-700/55 pt-5 text-xs text-muted dark:text-stone-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} نبْتة — نظام التعريف الذكي بالنباتات وتقييم الملاءمة البيئية.
            مشروع تخرج جامعي.
          </p>
          <p className="text-[11px]">
            Smart Plant Identification & Environmental Suitability
          </p>
        </div>
      </div>
    </footer>
  )
}
