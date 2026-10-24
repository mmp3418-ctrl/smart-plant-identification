import type { ReactNode } from 'react'
import { AlertTriangle, ShieldCheck, Stethoscope, Syringe } from 'lucide-react'
import { Badge, Card, CardContent, CardHeader } from '@/components/ui'
import type { PlantHealthProfile } from '@/types/identification'
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
  low: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  high: 'bg-red-500/15 text-red-300 border-red-400/30',
}

export function PlantHealthSection({
  health,
}: {
  health: PlantHealthProfile | null | undefined
}) {
  if (!health?.diseases?.length) return null

  return (
    <Card className="mt-4" glass padding="lg">
      <CardHeader
        title="صحة النبات والأمراض"
        description={health.summary}
        action={
          <Stethoscope className="size-5 text-brand" aria-hidden />
        }
      />
      <CardContent>
        <div className="space-y-4">
          {health.diseases.map((disease) => (
            <article
              key={disease.id}
              className="rounded-2xl border border-white/10 bg-slate-950/25 p-4 transition-colors hover:border-amber-400/25"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-ink">{disease.name}</h4>
                <Badge
                  className={cn(
                    'border',
                    severityClass[disease.severity],
                  )}
                >
                  خطورة {severityLabel[disease.severity]}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
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
                  icon={<Syringe className="size-3.5" />}
                  label="العلاج"
                  value={disease.treatment}
                />
              </div>
            </article>
          ))}
        </div>
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
    <div className="rounded-xl bg-white/5 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-brand">
        {icon}
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted">{value}</p>
    </div>
  )
}
