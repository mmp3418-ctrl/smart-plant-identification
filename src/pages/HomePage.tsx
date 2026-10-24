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
  amber: 'border-brand',
  gold: 'border-sage',
  slate: 'border-soil-brown',
}

export function HomePage() {
  const popular = getPopularPlants(6)
  const { content } = useSiteContent()
  const { hero, popularSection, features } = content.home

  return (
    <div>
      <section className="glass-panel border-b border-white/40 dark:border-stone-700/40">
        <div className="container-app py-8 sm:py-10 lg:py-12">
          <motion.div
            className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp}>
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
            className="mt-7 max-w-2xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <PlantSearchField placeholder={hero.searchPlaceholder} />
          </motion.div>
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
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark"
            >
              {popularSection.actionLabel}
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>

        <motion.div
          className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {popular.map((plant) => (
            <motion.div key={plant.id} variants={fadeUp}>
              <PlantCard plant={plant} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="glass-panel border-t border-white/40 dark:border-stone-700/40">
        <div className="container-app py-8 sm:py-10">
          <motion.div
            className="grid gap-6 sm:grid-cols-3"
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
                  'border-s-2 ps-4 transition-transform duration-300 hover:-translate-y-1',
                  accentBorder[feature.accent ?? 'amber'] ?? 'border-brand',
                )}
              >
                <h3 className="text-sm font-bold text-ink">{feature.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
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
