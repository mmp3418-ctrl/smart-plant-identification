import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, ArrowLeft, Upload } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { PlantCard } from '@/components/plants/PlantCard'
import { PlantSearchField } from '@/components/plants/PlantSearchField'
import { getPopularPlants } from '@/services/plants'
import { useSiteContent } from '@/context/ContentContext'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { cn } from '@/lib/cn'

const accentBorder: Record<string, string> = {
  amber: 'border-s-brand',
  gold: 'border-s-sage',
  slate: 'border-s-soil-brown',
}

export function HomePage() {
  const popular = getPopularPlants(6)
  const { content } = useSiteContent()
  const { hero, popularSection, features } = content.home

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/40 glass-panel dark:border-stone-700/40">
        <div
          className="pointer-events-none absolute -top-24 end-[-10%] size-72 rounded-full bg-sage/40 blur-3xl dark:bg-brand/20"
          aria-hidden
        />
        <div className="container-app relative py-9 sm:py-12 lg:py-14">
          <motion.div
            className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp}>
              {hero.badge ? (
                <Badge variant={hero.badge.variant ?? 'brand'} className="mb-4">
                  {hero.badge.label}
                </Badge>
              ) : null}
              <h1 className="text-balance text-3xl font-extrabold leading-[1.25] tracking-tight text-ink sm:text-4xl lg:text-[2.35rem]">
                {hero.title}
                {hero.titleHighlight ? (
                  <span className="text-brand"> {hero.titleHighlight}</span>
                ) : null}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                {hero.subtitle}
              </p>
            </motion.div>

            <motion.div
              className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch"
              variants={fadeUp}
            >
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
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-8 max-w-2xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.45 }}
          >
            <PlantSearchField placeholder={hero.searchPlaceholder} />
          </motion.div>
        </div>
      </section>

      <section className="container-app py-9 sm:py-12 lg:py-14">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              {popularSection.title}
            </h2>
            {popularSection.description ? (
              <p className="mt-1.5 text-sm text-muted">
                {popularSection.description}
              </p>
            ) : null}
          </div>
          {popularSection.actionTo && popularSection.actionLabel ? (
            <Link
              to={popularSection.actionTo}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand transition-colors hover:text-brand-dark"
            >
              {popularSection.actionLabel}
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>

        <motion.div
          className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-3 lg:gap-5"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.08 }}
        >
          {popular.map((plant) => (
            <motion.div key={plant.id} variants={fadeUp}>
              <PlantCard plant={plant} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="border-t border-white/40 glass-panel dark:border-stone-700/40">
        <div className="container-app py-9 sm:py-12">
          <motion.div
            className="grid gap-5 sm:grid-cols-3 sm:gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.id}
                variants={fadeUp}
                className={cn(
                  'rounded-2xl border border-white/50 border-s-[3px] bg-surface/45 p-4 ps-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-brand-dark/30 sm:p-5',
                  accentBorder[feature.accent ?? 'amber'] ?? 'border-s-brand',
                )}
              >
                <h3 className="text-sm font-extrabold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  )
}
