import { Link } from 'react-router-dom'
import { Camera, ArrowLeft, Upload } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { PlantCard } from '@/components/plants/PlantCard'
import { PlantSearchField } from '@/components/plants/PlantSearchField'
import { getPopularPlants } from '@/services/plants'
import { useSiteContent } from '@/context/ContentContext'
import { cn } from '@/lib/cn'

const accentBorder: Record<string, string> = {
  amber: 'border-amber-400',
  gold: 'border-yellow-300',
  slate: 'border-slate-400',
}

export function HomePage() {
  const popular = getPopularPlants(6)
  const { content } = useSiteContent()
  const { hero, popularSection, features } = content.home

  return (
    <div>
      <section className="glass-panel border-b border-white/10">
        <div className="container-app py-8 sm:py-10 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              {hero.badge ? (
                <Badge variant={hero.badge.variant ?? 'brand'} className="mb-3">
                  {hero.badge.label}
                </Badge>
              ) : null}
              <h1 className="text-balance text-2xl font-extrabold leading-snug text-ink sm:text-3xl lg:text-[2.15rem]">
                {hero.title}
                {hero.titleHighlight ? (
                  <span className="text-brand"> {hero.titleHighlight}</span>
                ) : null}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                {hero.subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              {hero.ctas.map((cta) => (
                <Link key={cta.id} to={cta.to} className="flex-1">
                  <Button
                    fullWidth
                    size="lg"
                    variant={cta.variant === 'outline' ? 'outline' : 'primary'}
                    leftIcon={
                      cta.icon === 'upload' ? (
                        <Upload className="size-5" />
                      ) : (
                        <Camera className="size-5" />
                      )
                    }
                  >
                    {cta.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-7 max-w-2xl">
            <PlantSearchField placeholder={hero.searchPlaceholder} />
          </div>
        </div>
      </section>

      <section className="container-app py-8 sm:py-10 lg:py-12">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink sm:text-xl">
              {popularSection.title}
            </h2>
            {popularSection.description ? (
              <p className="mt-1 text-sm text-muted">
                {popularSection.description}
              </p>
            ) : null}
          </div>
          {popularSection.actionTo && popularSection.actionLabel ? (
            <Link
              to={popularSection.actionTo}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:text-accent"
            >
              {popularSection.actionLabel}
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-3">
          {popular.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      </section>

      <section className="glass-panel border-t border-white/10">
        <div className="container-app py-8 sm:py-10">
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.id}
                className={cn(
                  'border-s-2 ps-4 transition-transform duration-300 hover:-translate-y-0.5',
                  accentBorder[feature.accent ?? 'amber'] ?? 'border-brand',
                )}
              >
                <h3 className="text-sm font-bold text-ink">{feature.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
