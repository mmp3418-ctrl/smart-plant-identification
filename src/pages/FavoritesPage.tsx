import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'
import { PlantCard } from '@/components/plants/PlantCard'
import { useAppData } from '@/context/AppDataContext'
import { getPlantById } from '@/services/plants'

export function FavoritesPage() {
  const { favorites } = useAppData()
  const plants = favorites
    .map((id) => getPlantById(id))
    .filter((plant): plant is NonNullable<typeof plant> => Boolean(plant))

  return (
    <div className="container-app py-6 sm:py-8 lg:py-10">
      <h1 className="text-xl font-extrabold text-ink sm:text-2xl">المفضلة</h1>
      <p className="mt-1 text-sm text-muted">النباتات التي حفظتها للرجوع السريع</p>

      {plants.length === 0 ? (
        <EmptyState
          className="mt-8 rounded-lg border border-dashed border-line bg-surface"
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
          {plants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}
    </div>
  )
}
