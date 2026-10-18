import { X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import {
  DIFFICULTY_OPTIONS,
  ENVIRONMENT_OPTIONS,
  SOIL_OPTIONS,
  SUNLIGHT_OPTIONS,
  type CareDifficulty,
  type EnvironmentType,
  type PlantFilters as Filters,
  type SoilType,
  type SunlightLevel,
} from '@/types/plant'

interface PlantFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
  className?: string
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'min-h-10 rounded-md border px-3 text-sm transition-colors',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-white/30 dark:border-stone-700/55 bg-white/70 dark:bg-stone-900/75 backdrop-blur-md text-ink dark:text-stone-100 hover:border-brand/40 shadow-md',
      )}
    >
      {children}
    </button>
  )
}

export function PlantFiltersPanel({
  filters,
  onChange,
  className,
}: PlantFiltersProps) {
  const hasActive =
    filters.soilTypes.length > 0 ||
    filters.environments.length > 0 ||
    filters.sunlight !== null ||
    filters.difficulty !== null

  return (
    <aside className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink dark:text-stone-100">
          تصفية النتائج
        </h2>
        {hasActive ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                soilTypes: [],
                environments: [],
                sunlight: null,
                difficulty: null,
              })
            }
            className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-muted dark:text-stone-300 hover:text-brand dark:hover:text-emerald-300"
          >
            <X className="size-3.5" aria-hidden />
            مسح الفلاتر
          </button>
        ) : null}
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted dark:text-stone-400">
          نوع التربة
        </h3>
        <div className="flex flex-wrap gap-2">
          {SOIL_OPTIONS.map((soil) => (
            <FilterChip
              key={soil}
              active={filters.soilTypes.includes(soil)}
              onClick={() =>
                onChange({
                  ...filters,
                  soilTypes: toggleValue<SoilType>(filters.soilTypes, soil),
                })
              }
            >
              {soil}
            </FilterChip>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted dark:text-stone-400">
          البيئة
        </h3>
        <div className="flex flex-wrap gap-2">
          {ENVIRONMENT_OPTIONS.map((env) => (
            <FilterChip
              key={env}
              active={filters.environments.includes(env)}
              onClick={() =>
                onChange({
                  ...filters,
                  environments: toggleValue<EnvironmentType>(
                    filters.environments,
                    env,
                  ),
                })
              }
            >
              {env}
            </FilterChip>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted dark:text-stone-400">
          أشعة الشمس
        </h3>
        <div className="flex flex-wrap gap-2">
          {SUNLIGHT_OPTIONS.map((level) => (
            <FilterChip
              key={level}
              active={filters.sunlight === level}
              onClick={() =>
                onChange({
                  ...filters,
                  sunlight:
                    filters.sunlight === level
                      ? null
                      : (level as SunlightLevel),
                })
              }
            >
              {level}
            </FilterChip>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted dark:text-stone-400">
          مستوى العناية
        </h3>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_OPTIONS.map((level) => (
            <FilterChip
              key={level}
              active={filters.difficulty === level}
              onClick={() =>
                onChange({
                  ...filters,
                  difficulty:
                    filters.difficulty === level
                      ? null
                      : (level as CareDifficulty),
                })
              }
            >
              {level}
            </FilterChip>
          ))}
        </div>
      </section>

      {hasActive ? (
        <Button
          variant="outline"
          fullWidth
          onClick={() =>
            onChange({
              ...filters,
              soilTypes: [],
              environments: [],
              sunlight: null,
              difficulty: null,
            })
          }
        >
          إعادة تعيين
        </Button>
      ) : null}
    </aside>
  )
}
