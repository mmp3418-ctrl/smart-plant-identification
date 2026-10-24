import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, Leaf, SearchX, LayoutDashboard } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'
import { PlantCard } from '@/components/plants/PlantCard'
import { PlantFiltersPanel } from '@/components/plants/PlantFilters'
import { PlantSearchField } from '@/components/plants/PlantSearchField'
import { usePlantCatalog } from '@/context/PlantCatalogContext'
import { useAuth } from '@/context/AuthContext'
import { DEFAULT_FILTERS, type PlantFilters } from '@/types/plant'
import { cn } from '@/lib/cn'

export function DirectoryPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const { plants, searchPlants, loading } = usePlantCatalog()
  const { user } = useAuth()

  const [filters, setFilters] = useState<PlantFilters>({
    ...DEFAULT_FILTERS,
    query: initialQuery,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  const results = useMemo(() => searchPlants(filters), [filters, searchPlants])
  const catalogEmpty = !loading && plants.length === 0
  const noSearchHits = !catalogEmpty && results.length === 0

  return (
    <div className="container-app py-6 sm:py-8 lg:py-10">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
          دليل النباتات
        </h1>
        <p className="mt-1 text-sm text-muted">
          محتوى ديناميكي يُدار من لوحة التحكم — ابحث وصنّف حسب الاسم والتربة والبيئة
        </p>
      </div>

      {!catalogEmpty ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <PlantSearchField
                initialQuery={filters.query}
                navigateOnSubmit={false}
                onQueryChange={(query) =>
                  setFilters((prev) => ({ ...prev, query }))
                }
              />
            </div>
            <Button
              variant="outline"
              className="shrink-0 lg:hidden"
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
        </>
      ) : null}

      {catalogEmpty ? (
        <EmptyState
          icon={<Leaf className="size-9 text-brand" strokeWidth={1.5} />}
          title="لا توجد نباتات مضافة حالياً"
          description="يمكنك إضافة النباتات وتصنيفاتها من لوحة التحكم. سيظهر المحتوى هنا تلقائياً فور الحفظ."
          action={
            user?.role === 'admin' ? (
              <Link to="/admin">
                <Button leftIcon={<LayoutDashboard className="size-4" />}>
                  فتح لوحة التحكم
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="outline">تسجيل الدخول للإدارة</Button>
              </Link>
            )
          }
          className="rounded-3xl border border-dashed border-brand/25 glass-panel py-16"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div
            className={cn(
              'rounded-2xl glass-panel p-4',
              filtersOpen ? 'block' : 'hidden lg:block',
            )}
          >
            <PlantFiltersPanel filters={filters} onChange={setFilters} />
          </div>

          <div>
            {noSearchHits ? (
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
                className="rounded-2xl border border-dashed border-line/80 glass-panel"
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
      )}
    </div>
  )
}
