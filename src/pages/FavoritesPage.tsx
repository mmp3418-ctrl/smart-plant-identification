import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, LogIn } from 'lucide-react'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { PlantCard } from '@/components/plants/PlantCard'
import { useAuth } from '@/context/AuthContext'
import { useAppData } from '@/context/AppDataContext'
import { usePlantCatalog } from '@/context/PlantCatalogContext'
import { fetchFavoritePlantSummaries } from '@/services/favoritesService'
import type { Plant } from '@/types/plant'
import type { FavoritePlantSummary } from '@/types/userData'

export function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const { favorites, dataLoading, dataError, refreshUserData } = useAppData()
  const { getPlantById } = usePlantCatalog()
  const [remoteSummaries, setRemoteSummaries] = useState<FavoritePlantSummary[]>(
    [],
  )
  const [remoteLoading, setRemoteLoading] = useState(false)

  const localPlants = useMemo(
    () =>
      favorites
        .map((id) => getPlantById(id))
        .filter((plant): plant is Plant => Boolean(plant)),
    [favorites, getPlantById],
  )

  const unresolvedIds = useMemo(() => {
    const localIds = new Set(localPlants.map((plant) => plant.id))
    return favorites.filter((id) => !localIds.has(id))
  }, [favorites, localPlants])

  useEffect(() => {
    let active = true
    if (unresolvedIds.length === 0) {
      setRemoteSummaries([])
      return
    }

    setRemoteLoading(true)
    void fetchFavoritePlantSummaries(unresolvedIds)
      .then((rows) => {
        if (active) setRemoteSummaries(rows)
      })
      .finally(() => {
        if (active) setRemoteLoading(false)
      })

    return () => {
      active = false
    }
  }, [unresolvedIds])

  if (authLoading || dataLoading) {
    return (
      <div className="container-app flex justify-center py-20">
        <Spinner label="جارٍ تحميل المفضلة…" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container-app py-6 sm:py-8 lg:py-10">
        <h1 className="text-xl font-extrabold text-ink dark:text-stone-100 sm:text-2xl">
          المفضلة
        </h1>
        <EmptyState
          className="mt-8 rounded-2xl glass-panel"
          icon={<LogIn className="size-8" strokeWidth={1.5} />}
          title="سجّل الدخول لعرض المفضلة"
          description="المفضلة السحابية متاحة بعد تسجيل الدخول عبر Supabase."
          action={
            <Link to="/login">
              <Button>تسجيل الدخول</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const isEmpty = localPlants.length === 0 && remoteSummaries.length === 0

  return (
    <div className="container-app py-6 sm:py-8 lg:py-10">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink dark:text-stone-100 sm:text-2xl">
            المفضلة
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-stone-300">
            النباتات المحفوظة في حسابك
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refreshUserData()}>
          تحديث
        </Button>
      </div>

      {dataError ? (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {dataError}
        </p>
      ) : null}

      {remoteLoading ? (
        <div className="mb-4">
          <Spinner label="جارٍ جلب تفاصيل النباتات…" />
        </div>
      ) : null}

      {isEmpty ? (
        <EmptyState
          className="mt-8 rounded-2xl glass-panel"
          icon={<Heart className="size-8" strokeWidth={1.5} />}
          title="لا توجد نباتات في المفضلة"
          description="أضف نباتات من الدليل أو من صفحات التفاصيل عبر زر القلب."
          action={
            <Link to="/directory">
              <Button variant="outline">تصفّح الدليل</Button>
            </Link>
          }
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-3">
          {localPlants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
          {remoteSummaries.map((summary) => (
            <RemoteFavoriteCard key={summary.id} summary={summary} />
          ))}
        </div>
      )}
    </div>
  )
}

function RemoteFavoriteCard({ summary }: { summary: FavoritePlantSummary }) {
  return (
    <article className="overflow-hidden rounded-2xl glass-panel hover-lift">
      <Link to={`/plants/${summary.id}`} className="block aspect-[4/3] bg-canvas dark:bg-stone-900">
        {summary.imageUrl ? (
          <img
            src={summary.imageUrl}
            alt={summary.arabicName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted dark:text-stone-400">
            <Heart className="size-8" strokeWidth={1.25} />
          </div>
        )}
      </Link>
      <div className="p-4">
        <Link
          to={`/plants/${summary.id}`}
          className="block text-base font-bold text-ink dark:text-stone-100 hover:text-brand dark:hover:text-emerald-300"
        >
          {summary.arabicName}
        </Link>
        <p className="mt-0.5 text-xs italic text-muted dark:text-stone-300">
          {summary.scientificName}
        </p>
        {summary.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted dark:text-stone-300">
            {summary.description}
          </p>
        ) : null}
      </div>
    </article>
  )
}
