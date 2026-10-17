import { Link } from 'react-router-dom'
import { History, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState } from '@/components/ui'
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
  const { history, clearHistory } = useAppData()

  return (
    <div className="container-app py-6 sm:py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
            سجل التعريف
          </h1>
          <p className="mt-1 text-sm text-muted">
            عمليات التعريف السابقة على هذا الجهاز
          </p>
        </div>
        {history.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="size-4" />}
            onClick={clearHistory}
            className="text-danger hover:bg-danger-soft"
          >
            مسح السجل
          </Button>
        ) : null}
      </div>

      {history.length === 0 ? (
        <EmptyState
          className="mt-8 rounded-lg border border-dashed border-line bg-surface"
          icon={<History className="size-8" strokeWidth={1.5} />}
          title="لا يوجد سجل بعد"
          description="عند تعريف نبات من الكاميرا أو الرفع، ستظهر النتائج هنا."
          action={
            <Link to="/identify">
              <Button>بدء التعريف</Button>
            </Link>
          }
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {history.map((item) => (
            <li key={item.id}>
              <Link
                to={`/plants/${item.plantId}`}
                className="flex gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-brand/35 sm:p-4"
              >
                {item.imagePreview ? (
                  <img
                    src={item.imagePreview}
                    alt=""
                    className="size-16 shrink-0 rounded-md object-cover sm:size-20"
                  />
                ) : (
                  <div className="size-16 shrink-0 rounded-md bg-canvas sm:size-20" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-ink">{item.plantName}</h2>
                    <Badge variant="brand">
                      {Math.round(item.confidence * 100)}% ثقة
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs italic text-muted">
                    {item.scientificName}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
