import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  FlaskConical,
  Leaf,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { Badge, Card, CardContent, CardHeader } from '@/components/ui'
import type { PlantHealthProfile } from '@/types/identification'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { cn } from '@/lib/cn'

const severityLabel: Record<
  PlantHealthProfile['diseases'][number]['severity'],
  string
> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
}

const severityClass: Record<
  PlantHealthProfile['diseases'][number]['severity'],
  string
> = {
  low: 'bg-brand-soft text-brand border-brand/20',
  medium: 'bg-warning-soft text-warning border-warning/25',
  high: 'bg-danger-soft text-danger border-danger/25',
}

export function PlantHealthSection({
  health,
}: {
  health: PlantHealthProfile | null | undefined
}) {
  if (!health?.diseases?.length) return null

  return (
    <Card className="mt-4 glow-border" glass padding="lg">
      <CardHeader
        title="الأمراض ومكافحة الآفات"
        description={health.summary}
        action={<Stethoscope className="size-5 text-brand" aria-hidden />}
      />
      <CardContent>
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {health.diseases.map((disease) => (
            <motion.article
              key={disease.id}
              variants={fadeUp}
              className="rounded-2xl border border-line/80 bg-canvas/50 p-4 transition-shadow hover:shadow-md dark:bg-brand-dark/30"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-ink">{disease.name}</h4>
                <Badge className={cn('border', severityClass[disease.severity])}>
                  خطورة {severityLabel[disease.severity]}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <HealthFact
                  icon={<AlertTriangle className="size-3.5" />}
                  label="الأعراض"
                  value={disease.symptoms}
                />
                <HealthFact
                  icon={<ShieldCheck className="size-3.5" />}
                  label="الوقاية"
                  value={disease.prevention}
                />
                <HealthFact
                  icon={<Leaf className="size-3.5" />}
                  label="علاج عضوي"
                  value={disease.organicTreatment}
                />
                <HealthFact
                  icon={<FlaskConical className="size-3.5" />}
                  label="علاج كيميائي"
                  value={disease.chemicalTreatment}
                />
              </div>
            </motion.article>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  )
}

function HealthFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/40 bg-surface/70 px-3 py-2.5 dark:border-white/10 dark:bg-brand-dark/40">
      <div className="mb-1 flex items-center gap-1.5 text-brand">
        {icon}
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted">{value}</p>
    </div>
  )
}
