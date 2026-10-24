import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Badge } from '@/components/ui'
import { useAppData } from '@/context/AppDataContext'
import { cn } from '@/lib/cn'
import type { Plant } from '@/types/plant'

interface PlantCardProps {
  plant: Plant
  className?: string
}

export function PlantCard({ plant, className }: PlantCardProps) {
  const { isFavorite, toggleFavorite } = useAppData()
  const favorite = isFavorite(plant.id)

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl',
        'glass-panel hover-lift',
        className,
      )}
    >
      <Link
        to={`/plants/${plant.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-surface"
      >
        <img
          src={plant.imageUrl}
          alt={plant.arabicName}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-dark/35 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          aria-hidden
        />
      </Link>

      <button
        type="button"
        onClick={() => void toggleFavorite(plant.id)}
        aria-label={favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        aria-pressed={favorite}
        className={cn(
          'absolute top-2.5 start-2.5 touch-target inline-flex items-center justify-center',
          'rounded-xl glass-strong text-muted shadow-sm',
          'transition-all duration-250 hover:text-brand hover:scale-110',
          favorite && 'text-brand border-brand/35 shadow-[0_0_16px_rgba(40,107,69,0.25)]',
        )}
      >
        <Heart
          className={cn('size-4 transition-transform', favorite && 'fill-current scale-110')}
          aria-hidden
        />
      </button>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <div>
          <Link
            to={`/plants/${plant.id}`}
            className="block text-base font-extrabold tracking-tight text-ink transition-colors hover:text-brand"
          >
            {plant.arabicName}
          </Link>
          <p className="mt-0.5 text-xs italic font-medium tracking-wide text-muted">
            {plant.scientificName}
          </p>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted">
          {plant.description}
        </p>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {plant.soilTypes.slice(0, 2).map((soil) => (
            <Badge key={soil} variant="soil">
              {soil}
            </Badge>
          ))}
          {plant.environments.slice(0, 1).map((env) => (
            <Badge key={env} variant="sage">
              {env}
            </Badge>
          ))}
        </div>
      </div>
    </article>
  )
}
