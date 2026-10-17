import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter, SearchX } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'
import { PlantCard } from '@/components/plants/PlantCard'
import { PlantFiltersPanel } from '@/components/plants/PlantFilters'
import { PlantSearchField } from '@/components/plants/PlantSearchField'
import { searchPlants } from '@/services/plants'
import { DEFAULT_FILTERS, type PlantFilters } from '@/types/plant'
import { cn } from '@/lib/cn'

export function DirectoryPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [filters, setFilters] = useState<PlantFilters>({
    ...DEFAULT_FILTERS,
    query: initialQuery,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  const results = useMemo(() => searchPlants(filters), [filters])

  return (
    <div className="container-app py-6 sm:py-8 lg:py-10">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
          دليل النباتات
        </h1>
        <p className="mt-1 text-sm text-muted">
          ابحث وصنّف النباتات حسب الاسم والتربة والبيئة
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <PlantSearchField
            initialQuery={filters.query}
            navigateOnSubmit={false}
            onQueryChange={(query) => setFilters((prev) => ({ ...prev, query }))}
          />
        </div>
        <Button
          variant="outline"
          className="lg:hidden shrink-0"
          leftIcon={<Filter className="size-4" />}
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
        >
          فلاتر
        </Button>
      </div>

      <div className="mb-4 text-sm text-muted">
        <span className="font-semibold text-ink">{results.length}</span> نتيجة
        {filters.query ? (
          <>
            {' '}
            لـ «<span className="text-ink">{filters.query}</span>»
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div
          className={cn(
            'rounded-lg border border-line bg-surface p-4',
            filtersOpen ? 'block' : 'hidden lg:block',
          )}
        >
          <PlantFiltersPanel filters={filters} onChange={setFilters} />
        </div>

        <div>
          {results.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-8" strokeWidth={1.5} />}
              title="لا توجد نتائج"
              description="جرّب تعديل كلمات البحث أو إزالة بعض الفلاتر."
              action={
                <Button
                  variant="outline"
                  onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                >
                  إعادة تعيين البحث
                </Button>
              }
              className="rounded-lg border border-dashed border-line bg-surface"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 xl:grid-cols-3">
              {results.map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
