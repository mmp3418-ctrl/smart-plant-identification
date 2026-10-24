import { type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Droplets,
  Sun,
  Thermometer,
  Heart,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { Badge, Button, EmptyState } from '@/components/ui'
import { useAppData } from '@/context/AppDataContext'
import { usePlantCatalog } from '@/context/PlantCatalogContext'
import { cn } from '@/lib/cn'

export function PlantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { getPlantById } = usePlantCatalog()
  const plant = id ? getPlantById(id) : undefined
  const { isFavorite, toggleFavorite } = useAppData()

  const identified = searchParams.get('identified') === '1'
  const confidence = searchParams.get('c')
  const confidencePct = confidence
    ? Math.round(Number.parseFloat(confidence) * 100)
    : null

  if (!plant) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="النبات غير موجود"
          description="تعذّر العثور على صفحة هذا النبات في الدليل."
          action={
            <Link to="/directory">
              <Button variant="outline">العودة إلى الدليل</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const favorite = isFavorite(plant.id)

  return (
    <div>
      <div className="border-b border-line bg-surface">
        <div className="container-app py-4">
          <Link
            to="/directory"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted hover:text-brand"
          >
            <ArrowRight className="size-4" aria-hidden />
            العودة إلى الدليل
          </Link>
        </div>
      </div>

      {identified && confidencePct !== null ? (
        <div className="border-b border-line bg-brand-soft">
          <div className="container-app flex items-center gap-2 py-3 text-sm text-brand">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            <p>
              تم التعريف بنجاح — درجة الثقة{' '}
              <span className="font-bold">{confidencePct}%</span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="container-app py-6 sm:py-8 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          {/* Image */}
          <div className="overflow-hidden rounded-2xl border border-line bg-canvas glass-panel">
            <img
              src={plant.coverImageUrl || plant.imageUrl}
              alt={plant.title || plant.arabicName}
              className="aspect-[4/3] w-full object-cover sm:aspect-[5/4]"
            />
          </div>

          {/* Meta */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">
                  {plant.classification || plant.category}
                </p>
                <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
                  {plant.title || plant.commonName || plant.arabicName}
                </h1>
                <p className="mt-1 text-sm italic text-muted">
                  {plant.scientificName}
                </p>
                <p className="mt-1 text-xs text-muted">العائلة: {plant.family || '—'}</p>
              </div>
              <Button
                variant={favorite ? 'secondary' : 'outline'}
                size="sm"
                leftIcon={
                  <Heart
                    className={cn('size-4', favorite && 'fill-current')}
                    aria-hidden
                  />
                }
                onClick={() => void toggleFavorite(plant.id)}
                aria-pressed={favorite}
              >
                {favorite ? 'في المفضلة' : 'إضافة للمفضلة'}
              </Button>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-muted sm:text-base">
              {plant.description}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 min-[390px]:grid-cols-3">
              <CareStat
                icon={<Droplets className="size-4" />}
                label="الري"
                value={plant.watering}
              />
              <CareStat
                icon={<Sun className="size-4" />}
                label="الشمس"
                value={plant.sunlight}
              />
              <CareStat
                icon={<Thermometer className="size-4" />}
                label="الحرارة"
                value={plant.temperatureRange}
              />
            </div>

            <div className="mt-5 space-y-3">
              <TagRow label="أنواع التربة" variant="soil" values={plant.soilTypes} />
              <TagRow
                label="البيئات المناسبة"
                variant="sage"
                values={plant.environments}
              />
              <TagRow
                label="المناطق"
                variant="brand"
                values={plant.suitableRegions}
              />
              {plant.tags.length > 0 ? (
                <TagRow label="وسوم" variant="brand" values={plant.tags} />
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted">سهولة العناية</span>
                <Badge variant="default">{plant.careDifficulty}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Care guide */}
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5 glass-panel">
            <h2 className="text-base font-bold text-ink">دليل العناية</h2>
            {plant.careGuide.length > 0 ? (
              <ol className="mt-3 space-y-2.5">
                {plant.careGuide.map((step, index) => (
                  <li
                    key={`${step}-${index}`}
                    className="flex gap-3 text-sm leading-relaxed text-muted"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-brand-soft text-xs font-bold text-brand">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-muted">لم تُضف إرشادات عناية بعد.</p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 glass-panel">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <AlertTriangle className="size-4 text-warning" aria-hidden />
              تحذيرات مهمة
            </h2>
            {plant.warnings.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {plant.warnings.map((warning) => (
                  <li
                    key={warning}
                    className="rounded-md bg-warning-soft/60 px-3 py-2.5 text-sm leading-relaxed text-warning"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">لا توجد تحذيرات خاصة مسجّلة.</p>
            )}
          </div>
        </section>

        {plant.diseases.length > 0 ? (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-5 glass-panel">
            <h2 className="text-base font-bold text-ink">الأمراض والتدابير الوقائية</h2>
            <div className="mt-4 space-y-3">
              {plant.diseases.map((disease) => (
                <article
                  key={disease.id}
                  className="rounded-xl border border-line/70 bg-canvas/60 p-4"
                >
                  <h3 className="text-sm font-bold text-ink">{disease.name}</h3>
                  <p className="mt-2 text-xs text-muted">
                    <span className="font-semibold text-ink">الأعراض: </span>
                    {disease.symptoms || '—'}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    <span className="font-semibold text-ink">الوقاية: </span>
                    {disease.prevention || '—'}
                  </p>
                  {disease.treatment ? (
                    <p className="mt-1 text-xs text-muted">
                      <span className="font-semibold text-ink">العلاج: </span>
                      {disease.treatment}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

function CareStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-line bg-canvas px-3 py-3">
      <div className="flex items-center gap-1.5 text-brand">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  )
}

function TagRow({
  label,
  values,
  variant,
}: {
  label: string
  values: string[]
  variant: 'soil' | 'sage' | 'brand'
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Badge key={value} variant={variant}>
            {value}
          </Badge>
        ))}
      </div>
    </div>
  )
}
