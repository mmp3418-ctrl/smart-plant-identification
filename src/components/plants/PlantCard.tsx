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
        'group relative flex flex-col overflow-hidden rounded-2xl glass-panel hover-lift',
        className,
      )}
    >
      <Link to={`/plants/${plant.id}`} className="relative block aspect-[4/3] overflow-hidden bg-canvas dark:bg-stone-900">
        <img
          src={plant.imageUrl}
          alt={plant.arabicName}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>

      <button
        type="button"
        onClick={() => toggleFavorite(plant.id)}
        aria-label={favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        aria-pressed={favorite}
        className={cn(
          'absolute top-2 start-2 touch-target inline-flex items-center justify-center',
          'rounded-xl glass-strong text-muted dark:text-stone-300',
          'transition-all duration-200 hover:text-brand dark:hover:text-emerald-300 hover:scale-105',
          favorite && 'text-brand dark:text-emerald-300 border-brand/30',
        )}
      >
        <Heart
          className={cn('size-4', favorite && 'fill-current')}
          aria-hidden
        />
      </button>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5 sm:p-4">
        <div>
          <Link
            to={`/plants/${plant.id}`}
            className="block text-base font-bold text-ink dark:text-stone-100 hover:text-brand dark:hover:text-emerald-300 transition-colors"
          >
            {plant.arabicName}
          </Link>
          <p className="mt-0.5 text-xs italic font-medium tracking-wide text-muted dark:text-stone-300">
            {plant.scientificName}
          </p>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted dark:text-stone-300">
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
