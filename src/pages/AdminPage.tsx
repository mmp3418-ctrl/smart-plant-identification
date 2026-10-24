import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Leaf,
  Users,
  Camera,
  Heart,
  Plus,
  Trash2,
  Save,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, Input } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useAppData } from '@/context/AppDataContext'
import { usePlantCatalog } from '@/context/PlantCatalogContext'
import {
  CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
  ENVIRONMENT_OPTIONS,
  SOIL_OPTIONS,
  SUNLIGHT_OPTIONS,
  createEmptyPlantInput,
  type CareDifficulty,
  type EnvironmentType,
  type PlantInput,
  type SoilType,
  type SunlightLevel,
  type WateringFrequency,
} from '@/types/plant'
import { cn } from '@/lib/cn'

export function AdminPage() {
  const { user, loading } = useAuth()
  const { favorites, history } = useAppData()
  const { plants, upsertPlant, deletePlant, resetToSeed } = usePlantCatalog()
  const [form, setForm] = useState<PlantInput>(() => createEmptyPlantInput())
  const [draftCare, setDraftCare] = useState('')
  const [draftTags, setDraftTags] = useState('')
  const [draftDisease, setDraftDisease] = useState({
    name: '',
    symptoms: '',
    prevention: '',
  })
  const [message, setMessage] = useState<string | null>(null)

  const popularCount = useMemo(
    () => plants.filter((plant) => plant.popular).length,
    [plants],
  )
  const soilCoverage = useMemo(
    () => new Set(plants.flatMap((plant) => plant.soilTypes)).size,
    [plants],
  )

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

  function updateField<K extends keyof PlantInput>(key: K, value: PlantInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleListValue<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value]
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const title = (form.title || form.commonName || form.arabicName).trim()
    if (!title || !form.scientificName.trim()) {
      setMessage('العنوان/الاسم الشائع والاسم العلمي مطلوبان.')
      return
    }

    const careGuide = [
      ...form.careGuide,
      ...(draftCare.trim() ? [draftCare.trim()] : []),
    ]
    const tags = [
      ...form.tags,
      ...draftTags
        .split(/[,،]/)
        .map((t) => t.trim())
        .filter(Boolean),
    ]

    const diseases = [...form.diseases]
    if (draftDisease.name.trim()) {
      diseases.push({
        id: `dis-${Date.now()}`,
        name: draftDisease.name.trim(),
        symptoms: draftDisease.symptoms.trim(),
        prevention: draftDisease.prevention.trim(),
      })
    }

    const cover = (form.coverImageUrl || form.imageUrl).trim()
    upsertPlant({
      ...form,
      title,
      arabicName: (form.arabicName || form.commonName || title).trim(),
      commonName: (form.commonName || form.arabicName || title).trim(),
      classification: form.classification || form.category,
      imageUrl: cover,
      coverImageUrl: cover,
      careGuide,
      tags: [...new Set(tags)],
      diseases,
    })

    setForm(createEmptyPlantInput())
    setDraftCare('')
    setDraftTags('')
    setDraftDisease({ name: '', symptoms: '', prevention: '' })
    setMessage('تم حفظ النبات في الدليل الديناميكي. سيظهر فوراً في صفحة الدليل.')
  }

  return (
    <div className="container-app py-6 sm:py-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="brand" className="mb-2">
            لوحة الإدارة
          </Badge>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
            إدارة دليل النباتات
          </h1>
          <p className="mt-1 text-sm text-muted">
            أضف أو احذف النباتات من المخزن الديناميكي — التغييرات تظهر فوراً في الدليل
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => resetToSeed()}>
            تفريغ / إعادة للبذرة
          </Button>
          <Link to="/directory">
            <Button variant="outline">فتح الدليل</Button>
          </Link>
        </div>
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

      <Card className="mt-6" glass padding="lg">
        <CardHeader
          title="إضافة نبات جديد"
          description="الحقول جاهزة للربط لاحقاً مع قاعدة بيانات / CMS"
          action={<Plus className="size-5 text-brand" />}
        />
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="العنوان / الاسم الشائع"
                value={form.title || form.commonName}
                onChange={(e) => {
                  updateField('title', e.target.value)
                  updateField('commonName', e.target.value)
                  updateField('arabicName', e.target.value)
                }}
                placeholder="مثال: نبتة الثعبان"
                required
              />
              <Input
                label="الاسم العلمي"
                value={form.scientificName}
                onChange={(e) => updateField('scientificName', e.target.value)}
                placeholder="Sansevieria trifasciata"
                required
              />
              <Input
                label="العائلة"
                value={form.family}
                onChange={(e) => updateField('family', e.target.value)}
              />
              <label className="block w-full">
                <span className="mb-1.5 block text-sm font-medium text-ink">
                  التصنيف
                </span>
                <select
                  className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink glass-panel"
                  value={form.category}
                  onChange={(e) => {
                    updateField('category', e.target.value)
                    updateField('classification', e.target.value)
                  }}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="رابط صورة الغلاف"
                value={form.coverImageUrl || form.imageUrl}
                onChange={(e) => {
                  updateField('coverImageUrl', e.target.value)
                  updateField('imageUrl', e.target.value)
                }}
                placeholder="https://..."
                className="sm:col-span-2"
              />
            </div>

            <label className="block w-full">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                الوصف التفصيلي
              </span>
              <textarea
                className="min-h-24 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink glass-panel"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField
                label="الري"
                value={String(form.watering)}
                onChange={(v) => updateField('watering', v as WateringFrequency)}
                options={['نادراً', 'أسبوعياً', 'مرتين أسبوعياً', 'يومياً', 'حسب الحاجة']}
              />
              <SelectField
                label="الإضاءة"
                value={String(form.sunlight)}
                onChange={(v) => updateField('sunlight', v as SunlightLevel)}
                options={[...SUNLIGHT_OPTIONS]}
              />
              <Input
                label="درجة الحرارة"
                value={form.temperatureRange}
                onChange={(e) => updateField('temperatureRange', e.target.value)}
                placeholder="18–28°م"
              />
              <SelectField
                label="سهولة العناية"
                value={form.careDifficulty}
                onChange={(v) => updateField('careDifficulty', v as CareDifficulty)}
                options={[...DIFFICULTY_OPTIONS]}
              />
            </div>

            <ChipGroup
              label="أنواع التربة"
              options={[...SOIL_OPTIONS]}
              selected={form.soilTypes}
              onToggle={(value) =>
                updateField(
                  'soilTypes',
                  toggleListValue(form.soilTypes, value as SoilType),
                )
              }
            />
            <ChipGroup
              label="البيئات"
              options={[...ENVIRONMENT_OPTIONS]}
              selected={form.environments}
              onToggle={(value) =>
                updateField(
                  'environments',
                  toggleListValue(form.environments, value as EnvironmentType),
                )
              }
            />

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                label="خطوة عناية (أضف واحدةً تلو الآخر)"
                value={draftCare}
                onChange={(e) => setDraftCare(e.target.value)}
                placeholder="ري عند جفاف السطح…"
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!draftCare.trim()) return
                    updateField('careGuide', [...form.careGuide, draftCare.trim()])
                    setDraftCare('')
                  }}
                >
                  إضافة خطوة
                </Button>
              </div>
            </div>
            {form.careGuide.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted">
                {form.careGuide.map((step) => (
                  <li key={step}>• {step}</li>
                ))}
              </ul>
            ) : null}

            <Input
              label="وسوم (مفصولة بفاصلة)"
              value={draftTags}
              onChange={(e) => setDraftTags(e.target.value)}
              placeholder="ظل، سهل العناية، منقي للهواء"
            />

            <div className="rounded-2xl border border-line/80 bg-canvas/50 p-4">
              <p className="mb-3 text-sm font-bold text-ink">مرض / آفة (اختياري)</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="الاسم"
                  value={draftDisease.name}
                  onChange={(e) =>
                    setDraftDisease((d) => ({ ...d, name: e.target.value }))
                  }
                />
                <Input
                  label="الأعراض"
                  value={draftDisease.symptoms}
                  onChange={(e) =>
                    setDraftDisease((d) => ({ ...d, symptoms: e.target.value }))
                  }
                />
                <Input
                  label="الوقاية"
                  value={draftDisease.prevention}
                  onChange={(e) =>
                    setDraftDisease((d) => ({ ...d, prevention: e.target.value }))
                  }
                />
              </div>
            </div>

            <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.popular}
                onChange={(e) => updateField('popular', e.target.checked)}
              />
              إظهار ضمن النباتات الشائعة في الرئيسية
            </label>

            {message ? (
              <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand">
                {message}
              </p>
            ) : null}

            <Button type="submit" leftIcon={<Save className="size-4" />}>
              حفظ في الدليل
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <CardHeader
            title="ملخص الدليل"
            description="توزيع سريع لمحتوى المخزن الديناميكي"
          />
          <CardContent className="space-y-2">
            <Row label="نباتات مميزة (شائعة)" value={`${popularCount}`} />
            <Row
              label="متوسط عناصر دليل العناية"
              value={
                plants.length === 0
                  ? '—'
                  : (
                      plants.reduce((sum, plant) => sum + plant.careGuide.length, 0) /
                      plants.length
                    ).toFixed(1)
              }
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
          description={
            plants.length === 0
              ? 'المخزن فارغ — أضف أول نبات من النموذج أعلاه'
              : 'إدارة مباشرة من لوحة التحكم'
          }
        />
        {plants.length === 0 ? (
          <p className="text-sm text-muted">لا توجد نباتات مضافة حالياً.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-2 py-2 font-semibold">العنوان</th>
                  <th className="px-2 py-2 font-semibold">العلمي</th>
                  <th className="px-2 py-2 font-semibold">التصنيف</th>
                  <th className="px-2 py-2 font-semibold">العناية</th>
                  <th className="px-2 py-2 font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {plants.map((plant) => (
                  <tr key={plant.id} className="border-b border-line/70 last:border-0">
                    <td className="px-2 py-2.5 font-medium text-ink">
                      <Link to={`/plants/${plant.id}`} className="hover:text-brand">
                        {plant.title || plant.arabicName}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 italic text-muted">
                      {plant.scientificName}
                    </td>
                    <td className="px-2 py-2.5 text-muted">{plant.category}</td>
                    <td className="px-2 py-2.5 text-muted">{plant.careDifficulty}</td>
                    <td className="px-2 py-2.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        leftIcon={<Trash2 className="size-3.5" />}
                        onClick={() => deletePlant(plant.id)}
                      >
                        حذف
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="block w-full">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <select
        className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink glass-panel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={cn(
                'min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors',
                active
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-surface text-muted hover:border-brand/40',
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>
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
    <div className="rounded-2xl border border-line bg-surface p-4 glass-panel">
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
