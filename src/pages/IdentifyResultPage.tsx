import { type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  Droplets,
  Leaf,
  MapPin,
  Sun,
  AlertTriangle,
  BookOpen,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui'
import {
  confidencePercent,
  displayPlantCommonName,
} from '@/services/plantIdentificationService'
import type { IdentifySessionResult } from '@/types/identifySession'
import { cn } from '@/lib/cn'

function isIdentifySessionResult(value: unknown): value is IdentifySessionResult {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.previewUrl === 'string' &&
    Array.isArray(record.candidates) &&
    typeof record.identifiedAt === 'string' &&
    record.match !== undefined &&
    typeof record.match === 'object'
  )
}

export function IdentifyResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state

  if (!isIdentifySessionResult(state)) {
    return <Navigate to="/identify" replace />
  }

  const { previewUrl, bestMatch, candidates, match } = state
  const top = candidates?.[0]
  const plant = match?.plant
  const confidence = top
    ? (top.confidencePercent ?? confidencePercent(top.score ?? 0))
    : 0

  const displayArabic =
    plant?.arabic_name?.trim() ||
    displayPlantCommonName(top, bestMatch)
  const displayScientific =
    plant?.scientific_name?.trim() ||
    top?.scientificName?.trim() ||
    bestMatch?.trim() ||
    'نبات غير محدد'

  return (
    <div className="container-app py-6 sm:py-8 lg:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted dark:text-stone-300 hover:text-brand dark:hover:text-emerald-300"
        >
          <ArrowRight className="size-4" aria-hidden />
          رجوع
        </button>
        <Link to="/identify">
          <Button variant="outline" size="sm" leftIcon={<Camera className="size-4" />}>
            تعريف جديد
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="brand">تم التعريف</Badge>
        <Badge variant="sage">{confidence}% ثقة</Badge>
        {match.matchedBy ? (
          <Badge variant="default">
            {match.matchedBy === 'taxon_id'
              ? 'مطابقة بمعرّف التصنيف'
              : 'مطابقة بالاسم العلمي'}
          </Badge>
        ) : (
          <Badge variant="warning">لا توجد بيانات محلية مطابقة</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="overflow-hidden rounded-2xl glass-panel">
          <img
            src={previewUrl}
            alt="الصورة المُحلَّلة"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>

        <Card glass padding="lg">
          <p className="text-sm text-muted dark:text-stone-300">
            {plant?.category || top?.family || 'نتيجة التعريف'}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink dark:text-stone-100 sm:text-3xl">
            {displayArabic}
          </h1>
          <p className="mt-1 text-sm italic text-muted dark:text-stone-300">
            {displayScientific}
          </p>
          {top?.scientificNameAuthorship ? (
            <p className="mt-0.5 text-xs text-muted dark:text-stone-400">
              {top.scientificNameAuthorship}
            </p>
          ) : null}

          {plant?.description ? (
            <p className="mt-4 text-sm leading-relaxed text-muted dark:text-stone-300">
              {plant.description}
            </p>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted dark:text-stone-300">
              تم التعرف على النبات عبر Pl@ntNet. لم تُعثر على سجل تفصيلي مطابق في
              قاعدة البيانات المحلية بعد.
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-3 min-[390px]:grid-cols-3">
            <MetaTile
              icon={<Droplets className="size-4" />}
              label="الري"
              value={plant?.watering || '—'}
            />
            <MetaTile
              icon={<Sun className="size-4" />}
              label="الشمس"
              value={plant?.sunlight || '—'}
            />
            <MetaTile
              icon={<Leaf className="size-4" />}
              label="العناية"
              value={plant?.care_difficulty || '—'}
            />
          </div>

          {plant ? (
            <div className="mt-5">
              <Link to={`/plants/${plant.id}`}>
                <Button fullWidth leftIcon={<BookOpen className="size-4" />}>
                  عرض الصفحة الكاملة في الدليل
                </Button>
              </Link>
            </div>
          ) : null}
        </Card>
      </div>

      {/* Soil & environment */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card glass padding="lg">
          <CardHeader
            title="أنواع التربة المناسبة"
            description="من قاعدة البيانات المحلية إن وُجدت"
          />
          <CardContent>
            {match.soilTypes.length === 0 ? (
              <p className="text-sm text-muted dark:text-stone-400">
                لا توجد بيانات تربة مرتبطة بهذا النبات حالياً.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {match.soilTypes.map((soil) => (
                  <Badge key={soil.id} variant="soil">
                    {soil.name_ar}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card glass padding="lg">
          <CardHeader
            title="البيئات المناسبة"
            description="ظروف النمو المرتبطة بالنبات"
            action={<MapPin className="size-4 text-brand dark:text-emerald-300" />}
          />
          <CardContent>
            {match.environments.length === 0 ? (
              <p className="text-sm text-muted dark:text-stone-400">
                لا توجد بيانات بيئة مرتبطة بهذا النبات حالياً.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {match.environments.map((env) => (
                  <Badge key={env.id} variant="sage">
                    {env.name_ar}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Care guides */}
      <Card className="mt-4" glass padding="lg">
        <CardHeader title="دليل العناية" />
        <CardContent>
          {match.careGuides.length === 0 ? (
            <p className="text-sm text-muted dark:text-stone-400">
              لا توجد تعليمات عناية محفوظة لهذا النبات في قاعدة البيانات.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {match.careGuides.map((step, index) => (
                <li
                  key={step.id}
                  className="flex gap-3 text-sm leading-relaxed text-muted dark:text-stone-300"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded bg-brand-soft text-xs font-bold text-brand dark:text-emerald-300">
                    {step.step_order ?? index + 1}
                  </span>
                  <span>{step.instruction_ar}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Warnings from DB */}
      {plant?.warnings && plant.warnings.length > 0 ? (
        <Card className="mt-4" glass padding="lg">
          <CardHeader
            title="تحذيرات"
            action={
              <AlertTriangle className="size-4 text-warning" aria-hidden />
            }
          />
          <CardContent>
            <ul className="space-y-2">
              {plant.warnings.map((warning) => (
                <li
                  key={warning}
                  className="rounded-md bg-warning-soft/60 px-3 py-2.5 text-sm text-warning"
                >
                  {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Other candidates */}
      {candidates.length > 1 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-bold text-ink dark:text-stone-100">
            احتمالات أخرى
          </h2>
          <ul className="space-y-2">
            {candidates.slice(1).map((candidate) => (
              <li
                key={`${candidate.scientificName}-${candidate.score}`}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl glass-panel px-4 py-3',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink dark:text-stone-100">
                    {displayPlantCommonName(candidate)}
                  </p>
                  <p className="truncate text-xs italic text-muted dark:text-stone-300">
                    {candidate?.scientificName ?? 'نبات غير محدد'}
                  </p>
                </div>
                <Badge variant="brand">
                  {candidate.confidencePercent ??
                    confidencePercent(candidate.score ?? 0)}
                  %
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function MetaTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/20 dark:border-stone-700/55 bg-canvas/60 dark:bg-stone-900/40 px-3 py-3">
      <div className="flex items-center gap-1.5 text-brand dark:text-emerald-300">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-1 text-sm font-bold text-ink dark:text-stone-100">{value}</p>
    </div>
  )
}
