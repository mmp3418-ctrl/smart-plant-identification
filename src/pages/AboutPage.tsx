import { Card } from '@/components/ui'

export function AboutPage() {
  return (
    <div className="container-app py-8 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
          عن المشروع
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          «نبْتة» منصة لتعريف النباتات وتقديم معلومات الملاءمة البيئية والعناية،
          طُوّرت كمشروع تخرج جامعي يدمج واجهة عربية حديثة مع مسار تعريفي بالصورة
          ودليل نباتات قابل للبحث والتصفية.
        </p>

        <div className="mt-8 space-y-4">
          <Card padding="lg">
            <h2 className="text-base font-bold text-ink">الأهداف</h2>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-sm text-muted leading-relaxed">
              <li>تيسير التعرف على النباتات للمستخدم العربي عبر الصورة.</li>
              <li>تقديم بيانات منظمة عن التربة، البيئة، والري والضوء.</li>
              <li>بناء أساس تقني قابل للتوسع نحو نماذج رؤية حاسوبية وSupabase.</li>
            </ul>
          </Card>

          <Card padding="lg">
            <h2 className="text-base font-bold text-ink">إخلاء مسؤولية أكاديمي</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              المحتوى الحالي لأغراض تعليمية وبحثية. نتائج التعريف الإرشادية لا
              تغني عن التحقق الميداني أو استشارة مختص زراعي، خاصة في الاستخدامات
              الغذائية أو الطبية.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
