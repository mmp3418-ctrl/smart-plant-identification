import { Link } from 'react-router-dom'
import { Camera, ArrowLeft, Upload } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { PlantCard } from '@/components/plants/PlantCard'
import { PlantSearchField } from '@/components/plants/PlantSearchField'
import { getPopularPlants } from '@/services/plants'

export function HomePage() {
  const popular = getPopularPlants(6)

  return (
    <div>
      {/* Compact editorial intro — not a wasteful hero */}
      <section className="border-b border-line bg-surface">
        <div className="container-app py-8 sm:py-10 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <Badge variant="brand" className="mb-3">
                مشروع تخرج جامعي
              </Badge>
              <h1 className="text-balance text-2xl font-extrabold leading-snug text-ink sm:text-3xl lg:text-[2.15rem]">
                عرّف نباتك من صورة،
                <span className="text-brand"> واعرف بيئته المناسبة</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                ارفع صورة أو التقطها بالكاميرا للحصول على الاسم العربي والعلمي،
                نوع التربة، ومتطلبات العناية — بواجهة عربية كاملة.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              <Link to="/identify" className="flex-1">
                <Button
                  fullWidth
                  size="lg"
                  leftIcon={<Camera className="size-5" />}
                >
                  التقاط / رفع صورة
                </Button>
              </Link>
              <Link to="/identify?mode=upload" className="flex-1">
                <Button
                  fullWidth
                  size="lg"
                  variant="outline"
                  leftIcon={<Upload className="size-5" />}
                >
                  رفع من المعرض
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-7 max-w-2xl">
            <PlantSearchField />
          </div>
        </div>
      </section>

      {/* Curated plants */}
      <section className="container-app py-8 sm:py-10 lg:py-12">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink sm:text-xl">
              نباتات شائعة
            </h2>
            <p className="mt-1 text-sm text-muted">
              مجموعة مختارة للبدء السريع في الاستكشاف
            </p>
          </div>
          <Link
            to="/directory"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark"
          >
            الدليل كاملاً
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-3">
          {popular.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      </section>

      {/* Quiet capability strip — not feature cards */}
      <section className="border-t border-line bg-surface">
        <div className="container-app py-8 sm:py-10">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="border-s-2 border-brand ps-4">
              <h3 className="text-sm font-bold text-ink">تعريف بالصورة</h3>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                كاميرا أو رفع ملف، مع معالجة واضحة لحالات التحميل والخطأ.
              </p>
            </div>
            <div className="border-s-2 border-sage ps-4">
              <h3 className="text-sm font-bold text-ink">بحث وتصفية</h3>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                ابحث بالعربية أو بالاسم العلمي، وفلتر حسب التربة والبيئة.
              </p>
            </div>
            <div className="border-s-2 border-soil-brown ps-4">
              <h3 className="text-sm font-bold text-ink">دليل عناية</h3>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                ري، ضوء، حرارة، وتحذيرات مهمة لكل نبات في قاعدة البيانات.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
