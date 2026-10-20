import { Link } from 'react-router-dom'
import { History, Trash2, LogIn } from 'lucide-react'
import { Badge, Button, EmptyState, Spinner } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useAppData } from '@/context/AppDataContext'

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function HistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const {
    history,
    clearHistory,
    dataLoading,
    dataError,
    refreshUserData,
  } = useAppData()

  if (authLoading || dataLoading) {
    return (
      <div className="container-app flex justify-center py-20">
        <Spinner label="جارٍ تحميل سجل التعريف…" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container-app py-6 sm:py-8 lg:py-10">
        <h1 className="text-xl font-extrabold text-ink dark:text-stone-100 sm:text-2xl">
          سجل التعريف
        </h1>
        <EmptyState
          className="mt-8 rounded-2xl glass-panel"
          icon={<LogIn className="size-8" strokeWidth={1.5} />}
          title="سجّل الدخول لعرض السجل السحابي"
          description="يُحفظ كل تعريف ناجح في حسابك بعد تسجيل الدخول."
          action={
            <Link to="/login">
              <Button>تسجيل الدخول</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-app py-6 sm:py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink dark:text-stone-100 sm:text-2xl">
            سجل التعريف
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-stone-300">
            عمليات التعريف المرتبطة بحسابك
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refreshUserData()}
          >
            تحديث
          </Button>
          {history.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="size-4" />}
              onClick={() => void clearHistory()}
              className="text-danger hover:bg-danger-soft"
            >
              مسح السجل
            </Button>
          ) : null}
        </div>
      </div>

      {dataError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {dataError}
        </p>
      ) : null}

      {history.length === 0 ? (
        <EmptyState
          className="mt-8 rounded-2xl glass-panel"
          icon={<History className="size-8" strokeWidth={1.5} />}
          title="لا يوجد سجل بعد"
          description="عند تعريف نبات بنجاح، ستُحفظ النتيجة هنا في حسابك."
          action={
            <Link to="/identify">
              <Button>بدء التعريف</Button>
            </Link>
          }
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {history.map((item) => {
            const href =
              item.plantId && item.plantId !== 'unknown'
                ? `/plants/${item.plantId}`
                : '/identify'
            return (
              <li key={item.id}>
                <Link
                  to={href}
                  className="flex gap-3 rounded-2xl glass-panel p-3 transition-colors hover:border-brand/35 sm:p-4"
                >
                  {item.imagePreview ? (
                    <img
                      src={item.imagePreview}
                      alt=""
                      className="size-16 shrink-0 rounded-md object-cover sm:size-20"
                    />
                  ) : (
                    <div className="size-16 shrink-0 rounded-md bg-canvas dark:bg-stone-900 sm:size-20" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-ink dark:text-stone-100">
                        {item.plantName}
                      </h2>
                      <Badge variant="brand">
                        {Math.round(item.confidence * 100)}% ثقة
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs italic text-muted dark:text-stone-300">
                      {item.scientificName}
                    </p>
                    <p className="mt-2 text-xs text-muted dark:text-stone-400">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
