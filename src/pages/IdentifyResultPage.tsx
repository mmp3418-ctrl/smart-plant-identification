import { type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Camera,
  Droplets,
  MapPin,
  Sun,
  Thermometer,
  AlertTriangle,
  BookOpen,
  Sprout,
  Droplet,
  Scissors,
  CloudFog,
  FlaskConical,
  FileText,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui'
import { PlantHealthSection } from '@/components/identify/PlantHealthSection'
import {
  confidencePercent,
  displayPlantCommonName,
  PLANTNET_UNRECOGNIZED_MESSAGE,
} from '@/services/plantService'
import type { IdentifySessionResult } from '@/types/identifySession'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { cn } from '@/lib/cn'

function isIdentifySessionResult(value: unknown): value is IdentifySessionResult {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.previewUrl === 'string' &&
    Array.isArray(record.candidates) &&
    typeof record.identifiedAt === 'string' &&
    typeof record.isPlant === 'boolean' &&
    record.match !== undefined &&
    typeof record.match === 'object'
  )
}

function pickText(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

export function IdentifyResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state

  if (!isIdentifySessionResult(state)) {
    return <Navigate to="/identify" replace />
  }

  const { previewUrl, bestMatch, candidates, match, isPlant, message, primary } =
    state

  if (!isPlant || !candidates?.[0]) {
    return (
      <div className="container-app py-6 sm:py-8 lg:py-10">
        <Card glass padding="lg">
          <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft/50 px-4 py-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <h1 className="text-lg font-extrabold text-ink">تعذّر التعرف بدقة</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {message?.trim() || PLANTNET_UNRECOGNIZED_MESSAGE}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <Link to="/identify">
              <Button fullWidth leftIcon={<Camera className="size-4" />}>
                رفع صورة أوضح
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const top = candidates[0]
  const plant = match?.plant
  const care = primary?.careInfo ?? top.careInfo
  const health = primary?.health ?? top.health

  const confidence =
    primary?.confidence ??
    top.confidencePercent ??
    confidencePercent(top.score ?? 0)

  const displayArabic =
    pickText(
      primary?.commonName,
      top.commonName,
      top.name,
      top.commonNames?.[0],
      plant?.arabic_name,
    ) || displayPlantCommonName(top, bestMatch)

  const displayScientific =
    pickText(
      primary?.scientificName,
      top.scientificName,
      plant?.scientific_name,
      bestMatch,
    ) || null

  const familyValue =
    pickText(primary?.family, top.family, plant?.family) || 'غير محدد'

  const overviewValue = pickText(
    care?.overview,
    top.overview,
    top.description,
    plant?.description,
  )
  const wateringValue = pickText(care?.watering, top.watering, plant?.watering)
  const wateringSchedule = pickText(care?.wateringSchedule, top.wateringSchedule)
  const moistureValue = pickText(care?.moistureNeeds, top.moistureNeeds)
  const lightValue = pickText(care?.light, top.light, plant?.sunlight)
  const temperatureValue = pickText(
    care?.temperature,
    top.temperature,
    plant?.temperature_range,
  )
  const humidityValue = pickText(care?.humidity, top.humidity)
  const soilValue = pickText(care?.soil, top.soil)
  const fertilizerValue = pickText(care?.fertilizer, top.fertilizer)
  const propagationValue = pickText(care?.propagation, top.propagation)
  const careGuideValue = pickText(top.careGuide)

  return (
    <motion.div
      className="container-app py-6 sm:py-8 lg:py-10"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div
        className="mb-5 flex flex-wrap items-center justify-between gap-3"
        variants={fadeUp}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted hover:text-brand"
        >
          <ArrowRight className="size-4" aria-hidden />
          رجوع
        </button>
        <Link to="/identify">
          <Button variant="outline" size="sm" leftIcon={<Camera className="size-4" />}>
            تعريف جديد
          </Button>
        </Link>
      </motion.div>

      <motion.div className="mb-4 flex flex-wrap items-center gap-2" variants={fadeUp}>
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
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <motion.div
          className="overflow-hidden rounded-2xl glass-panel glow-border"
          variants={fadeUp}
        >
          <img
            src={previewUrl}
            alt="الصورة المُحلَّلة"
            className="aspect-[4/3] w-full object-cover"
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card glass padding="lg" className="glow-border">
            <p className="text-sm text-muted">{plant?.category || familyValue}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
              {displayArabic}
            </h1>
            {displayScientific ? (
              <p className="mt-1 text-sm italic text-muted">{displayScientific}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted">العائلة: {familyValue}</p>

            {overviewValue ? (
              <div className="mt-4 rounded-xl border border-line/70 bg-canvas/60 px-3 py-3 dark:bg-brand-dark/30">
                <div className="mb-1 flex items-center gap-1.5 text-brand">
                  <FileText className="size-3.5" />
                  <span className="text-xs font-semibold">نظرة عامة</span>
                </div>
                <p className="text-sm leading-relaxed text-muted">{overviewValue}</p>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
              {wateringValue ? (
                <MetaTile icon={<Droplets className="size-4" />} label="الري" value={wateringValue} />
              ) : null}
              {wateringSchedule ? (
                <MetaTile icon={<Droplet className="size-4" />} label="جدول الري" value={wateringSchedule} />
              ) : null}
              {moistureValue ? (
                <MetaTile icon={<CloudFog className="size-4" />} label="احتياج الرطوبة" value={moistureValue} />
              ) : null}
              {lightValue ? (
                <MetaTile icon={<Sun className="size-4" />} label="الإضاءة" value={lightValue} />
              ) : null}
              {temperatureValue ? (
                <MetaTile icon={<Thermometer className="size-4" />} label="درجة الحرارة" value={temperatureValue} />
              ) : null}
              {humidityValue ? (
                <MetaTile icon={<CloudFog className="size-4" />} label="رطوبة الهواء" value={humidityValue} />
              ) : null}
              {soilValue ? (
                <MetaTile icon={<Sprout className="size-4" />} label="التربة" value={soilValue} />
              ) : null}
              {fertilizerValue ? (
                <MetaTile icon={<FlaskConical className="size-4" />} label="التسميد" value={fertilizerValue} />
              ) : null}
              {propagationValue ? (
                <MetaTile
                  icon={<Scissors className="size-4" />}
                  label="الإكثار"
                  value={propagationValue}
                  className="min-[390px]:col-span-2"
                />
              ) : null}
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
        </motion.div>
      </div>

      {(match.soilTypes.length > 0 || match.environments.length > 0) && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {match.soilTypes.length > 0 ? (
            <Card glass padding="lg">
              <CardHeader title="أنواع التربة المناسبة" />
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {match.soilTypes.map((soil) => (
                    <Badge key={soil.id} variant="soil">
                      {soil.name_ar}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {match.environments.length > 0 ? (
            <Card glass padding="lg">
              <CardHeader
                title="البيئات المناسبة"
                action={<MapPin className="size-4 text-brand" />}
              />
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {match.environments.map((env) => (
                    <Badge key={env.id} variant="sage">
                      {env.name_ar}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {match.careGuides.length > 0 || careGuideValue ? (
        <Card className="mt-4" glass padding="lg">
          <CardHeader
            title="دليل العناية"
            description={
              match.careGuides.length > 0
                ? 'من قاعدة البيانات المحلية'
                : 'ملف عناية مُشتق حسب تصنيف النبات'
            }
          />
          <CardContent>
            {match.careGuides.length > 0 ? (
              <ol className="space-y-2.5">
                {match.careGuides.map((step, index) => (
                  <li
                    key={step.id}
                    className="flex gap-3 text-sm leading-relaxed text-muted"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-brand-soft text-xs font-bold text-brand">
                      {step.step_order ?? index + 1}
                    </span>
                    <span>{step.instruction_ar}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                {careGuideValue}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <PlantHealthSection health={health} />

      {plant?.warnings && plant.warnings.length > 0 ? (
        <Card className="mt-4" glass padding="lg">
          <CardHeader
            title="تحذيرات"
            action={<AlertTriangle className="size-4 text-warning" aria-hidden />}
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

      {candidates.length > 1 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-bold text-ink">احتمالات أخرى</h2>
          <ul className="space-y-2">
            {candidates.slice(1).map((candidate) => (
              <li
                key={`${candidate.scientificName}-${candidate.score}`}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl glass-panel hover-lift px-4 py-3',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {displayPlantCommonName(candidate)}
                  </p>
                  <p className="truncate text-xs italic text-muted">
                    {candidate.scientificName || '—'}
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
    </motion.div>
  )
}

function MetaTile({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line/70 bg-canvas/50 px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/35 dark:bg-brand-dark/30',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-brand">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-1 text-sm font-bold leading-snug text-ink">{value}</p>
    </div>
  )
}
