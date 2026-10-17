import { type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Leaf, Users, Camera, Heart } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useAppData } from '@/context/AppDataContext'
import { getAllPlants } from '@/services/plants'

export function AdminPage() {
  const { user, loading } = useAuth()
  const { favorites, history } = useAppData()
  const plants = getAllPlants()

  if (loading) {
    return (
      <div className="container-app py-16 text-center text-sm text-muted">
        جارٍ التحقق من الصلاحيات…
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  const popularCount = plants.filter((plant) => plant.popular).length
  const soilCoverage = new Set(plants.flatMap((plant) => plant.soilTypes)).size

  return (
    <div className="container-app py-6 sm:py-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="brand" className="mb-2">
            لوحة الإدارة
          </Badge>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
            نظرة عامة على المحتوى
          </h1>
          <p className="mt-1 text-sm text-muted">
            واجهة إدارية أولية لإدارة دليل النباتات ومتابعة النشاط المحلي
          </p>
        </div>
        <Link to="/directory">
          <Button variant="outline">فتح الدليل</Button>
        </Link>
      </div>

      <div className="grid gap-3 min-[390px]:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Leaf className="size-4" />}
          label="النباتات في الدليل"
          value={String(plants.length)}
        />
        <StatTile
          icon={<Camera className="size-4" />}
          label="عمليات التعريف"
          value={String(history.length)}
        />
        <StatTile
          icon={<Heart className="size-4" />}
          label="المفضلة"
          value={String(favorites.length)}
        />
        <StatTile
          icon={<Users className="size-4" />}
          label="أنواع التربة المغطاة"
          value={String(soilCoverage)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <CardHeader
            title="ملخص الدليل"
            description="توزيع سريع لمحتوى قاعدة البيانات الحالية"
          />
          <CardContent className="space-y-2">
            <Row label="نباتات مميزة (شائعة)" value={`${popularCount}`} />
            <Row
              label="متوسط عناصر دليل العناية"
              value={(
                plants.reduce((sum, plant) => sum + plant.careGuide.length, 0) /
                plants.length
              ).toFixed(1)}
            />
            <Row
              label="نباتات بتحذيرات"
              value={String(plants.filter((plant) => plant.warnings.length > 0).length)}
            />
          </CardContent>
        </Card>

        <Card padding="lg">
          <CardHeader
            title="أحدث التعريفات"
            description="من السجل المحلي لهذا الحساب"
          />
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted">لا توجد عمليات تعريف بعد.</p>
            ) : (
              <ul className="space-y-2">
                {history.slice(0, 5).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 border-b border-line pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {item.plantName}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {item.scientificName}
                      </p>
                    </div>
                    <Badge variant="sage">
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4" padding="lg">
        <CardHeader
          title="كتالوج النباتات"
          description="قائمة مختصرة — الربط بـ Supabase لإدارة CRUD سيأتي في مرحلة لاحقة"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-2 py-2 font-semibold">العربي</th>
                <th className="px-2 py-2 font-semibold">العلمي</th>
                <th className="px-2 py-2 font-semibold">التصنيف</th>
                <th className="px-2 py-2 font-semibold">العناية</th>
                <th className="px-2 py-2 font-semibold">شائع</th>
              </tr>
            </thead>
            <tbody>
              {plants.map((plant) => (
                <tr key={plant.id} className="border-b border-line/70 last:border-0">
                  <td className="px-2 py-2.5 font-medium text-ink">
                    <Link to={`/plants/${plant.id}`} className="hover:text-brand">
                      {plant.arabicName}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 italic text-muted">
                    {plant.scientificName}
                  </td>
                  <td className="px-2 py-2.5 text-muted">{plant.category}</td>
                  <td className="px-2 py-2.5 text-muted">{plant.careDifficulty}</td>
                  <td className="px-2 py-2.5">
                    {plant.popular ? (
                      <Badge variant="brand">نعم</Badge>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-brand">
        {icon}
        <span className="text-xs font-semibold text-muted">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-bold text-ink">{value}</span>
    </div>
  )
}
