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
        'group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface',
        className,
      )}
    >
      <Link to={`/plants/${plant.id}`} className="relative block aspect-[4/3] overflow-hidden bg-canvas">
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
          'rounded-md border border-line/80 bg-surface/95 text-muted',
          'transition-colors hover:text-brand',
          favorite && 'text-brand border-brand/30 bg-surface',
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
            className="block text-base font-bold text-ink hover:text-brand transition-colors"
          >
            {plant.arabicName}
          </Link>
          <p className="mt-0.5 text-xs italic text-muted font-medium tracking-wide">
            {plant.scientificName}
          </p>
        </div>

        <p className="line-clamp-2 text-sm text-muted leading-relaxed">
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
