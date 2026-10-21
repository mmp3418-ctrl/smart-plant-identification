import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Camera,
  Upload,
  X,
  ImageIcon,
  RefreshCw,
  Leaf,
  AlertCircle,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { GreenLoadingOverlay } from '@/components/system/GreenLoadingOverlay'
import { useCamera } from '@/hooks/useCamera'
import { useAppData } from '@/context/AppDataContext'
import {
  identifyPlantWithPlantNet,
  isPlantNetConfigured,
  validatePlantImage,
} from '@/services/plantIdentificationService'
import { matchPlantFromIdentification } from '@/services/plantMatchingService'
import { dataUrlToFile, fileToDataUrl } from '@/services/imageUtils'
import { isServiceError } from '@/services/errors'
import type { IdentifySessionResult } from '@/types/identifySession'
import type { PlantNetOrgan } from '@/types/plantnet'
import { cn } from '@/lib/cn'

type Phase = 'ready' | 'preview' | 'analyzing' | 'error'

const ORGAN_OPTIONS: Array<{ value: PlantNetOrgan; label: string }> = [
  { value: 'auto', label: 'تلقائي' },
  { value: 'leaf', label: 'ورقة' },
  { value: 'flower', label: 'زهرة' },
  { value: 'habit', label: 'شكل عام' },
  { value: 'fruit', label: 'ثمرة' },
  { value: 'bark', label: 'لحاء' },
]

export function IdentifyPage() {
  const [searchParams] = useSearchParams()
  const preferUpload = searchParams.get('mode') === 'upload'
  const navigate = useNavigate()
  const { addHistory } = useAppData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const camera = useCamera()

  const [phase, setPhase] = useState<Phase>('ready')
  const [preview, setPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [organ, setOrgan] = useState<PlantNetOrgan>('auto')

  const { start, stop } = camera

  useEffect(() => {
    if (!preferUpload) {
      void start()
    }
    return () => stop()
  }, [preferUpload, start, stop])

  const setPreviewFromFile = useCallback(async (file: File) => {
    try {
      validatePlantImage(file)
    } catch (error) {
      setPhase('error')
      setErrorMessage(
        isServiceError(error)
          ? error.message
          : 'يرجى اختيار ملف صورة صالح (JPEG أو PNG أو WebP، بحد أقصى 5 ميغابايت).',
      )
      return
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      setPendingFile(file)
      setPreview(dataUrl)
      setPhase('preview')
      setErrorMessage(null)
      stop()
    } catch {
      setPhase('error')
      setErrorMessage('فشل تحميل الصورة من الجهاز.')
    }
  }, [stop])

  async function analyze() {
    if (!preview) return

    if (!isPlantNetConfigured()) {
      setPhase('error')
      setErrorMessage(
        'تعذّر تهيئة مفتاح Pl@ntNet. أعد تحميل الصفحة أو تحقق من إعدادات المشروع.',
      )
      return
    }

    setPhase('analyzing')
    setErrorMessage(null)

    try {
      const file =
        pendingFile ??
        (await dataUrlToFile(preview, `plant-${Date.now()}.jpg`))

      const identification = await identifyPlantWithPlantNet(file, {
        organ,
        maxResults: 5,
      })

      if (!identification.ok) {
        setPhase('error')
        setErrorMessage(identification.message)
        return
      }

      const top = identification.candidates[0]
      let match
      try {
        match = await matchPlantFromIdentification({
          scientificName:
            top?.scientificName ?? identification.bestMatch ?? '',
          taxonId: top?.taxonId ?? null,
        })
      } catch (error) {
        // Identification succeeded; matching can fail if Supabase is down
        console.warn('[IdentifyPage] matching failed:', error)
        match = {
          plant: null,
          soilTypes: [],
          environments: [],
          careGuides: [],
          matchedBy: null,
        }
      }

      const session: IdentifySessionResult = {
        previewUrl: preview,
        bestMatch: identification.bestMatch,
        candidates: identification.candidates,
        identifiedAt: identification.identifiedAt,
        match,
      }

      await addHistory({
        plantId: match.plant?.id ?? top?.scientificName ?? 'unknown',
        plantName:
          match.plant?.arabic_name?.trim() ||
          top?.commonNames[0] ||
          top?.scientificName ||
          'نبات معرَّف',
        scientificName:
          match.plant?.scientific_name ||
          top?.scientificName ||
          identification.bestMatch ||
          '—',
        confidence: top?.score ?? 0,
        imagePreview: preview,
      })

      stop()
      navigate('/identify/result', { state: session })
    } catch (error) {
      setPhase('error')
      setErrorMessage(
        isServiceError(error)
          ? error.message
          : 'تعذّر تحليل الصورة. حاول مرة أخرى بصورة أوضح.',
      )
    }
  }

  async function handleCapture() {
    const shot = camera.capture()
    if (!shot) {
      setPhase('error')
      setErrorMessage('لم يتم التقاط إطار صالح. تأكد من تفعيل الكاميرا.')
      return
    }

    try {
      const file = await dataUrlToFile(shot, `capture-${Date.now()}.jpg`)
      setPendingFile(file)
      setPreview(shot)
      setPhase('preview')
      setErrorMessage(null)
      stop()
    } catch {
      setPhase('error')
      setErrorMessage('تعذّر حفظ صورة الكاميرا.')
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      void setPreviewFromFile(file)
    }
  }

  function reset() {
    setPreview(null)
    setPendingFile(null)
    setPhase('ready')
    setErrorMessage(null)
    setIsDragging(false)
    if (!preferUpload) void start()
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#142D21] text-stone-100">
      {phase === 'analyzing' ? (
        <GreenLoadingOverlay
          message="جارٍ تعريف النبات عبر Pl@ntNet…"
          zIndexClass="z-[95]"
        />
      ) : null}

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="touch-target inline-flex items-center justify-center rounded-md text-emerald-200/80 hover:text-white"
          aria-label="إغلاق والعودة"
        >
          <X className="size-5" />
        </Link>
        <div className="text-center">
          <p className="text-sm font-bold text-stone-50">تعريف النبات</p>
          <p className="text-xs text-emerald-200/70">
            كاميرا أو رفع صورة — ثم معاينة قبل التحليل
          </p>
        </div>
        <span className="touch-target inline-flex items-center justify-center text-emerald-200/80">
          <Leaf className="size-5" aria-hidden />
        </span>
      </div>

      {/* Viewport */}
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-6 sm:px-6">
        <div
          className={cn(
            'relative min-h-[52vh] flex-1 overflow-hidden rounded-2xl bg-black/40 transition-shadow',
            isDragging && 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-[#142D21]',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {preview ? (
            <img
              src={preview}
              alt="معاينة الصورة قبل التعريف"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <video
              ref={camera.videoRef}
              playsInline
              muted
              autoPlay
              className={cn(
                'absolute inset-0 h-full w-full object-cover',
                !camera.stream && 'opacity-0',
              )}
            />
          )}

          {!preview && !camera.stream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              {camera.starting ? (
                <Spinner
                  label="جارٍ تشغيل الكاميرا…"
                  className="text-emerald-200"
                />
              ) : (
                <>
                  <ImageIcon
                    className="size-10 text-emerald-200/70"
                    strokeWidth={1.25}
                  />
                  <p className="text-sm text-emerald-100/80">
                    {camera.error ||
                      'اسحب صورة هنا أو استخدم زر الرفع / الكاميرا'}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Upload className="size-4" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    اختيار صورة
                  </Button>
                </>
              )}
            </div>
          ) : null}

          {/* Drag hint overlay */}
          {isDragging ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-950/70 backdrop-blur-sm">
              <p className="text-sm font-semibold text-emerald-100">
                أفلت الصورة هنا للمعاينة
              </p>
            </div>
          ) : null}

          {/* Scan frame */}
          {phase !== 'analyzing' && !isDragging ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
              <div className="relative aspect-square w-[78%] max-w-[280px]">
                <span className="absolute start-0 top-0 h-8 w-8 border-s-2 border-t-2 border-emerald-200" />
                <span className="absolute end-0 top-0 h-8 w-8 border-e-2 border-t-2 border-emerald-200" />
                <span className="absolute start-0 bottom-0 h-8 w-8 border-s-2 border-b-2 border-emerald-200" />
                <span className="absolute end-0 bottom-0 h-8 w-8 border-e-2 border-b-2 border-emerald-200" />
                {!preview ? (
                  <span className="scan-line absolute inset-x-3 h-px bg-emerald-200/80" />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {phase === 'error' && errorMessage ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-950/40 px-3 py-3 text-sm text-red-100"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        {/* Controls */}
        <div className="mt-5 space-y-3">
          {phase !== 'analyzing' ? (
            <div className="space-y-2">
              <p className="text-center text-xs text-emerald-100/70">
                نوع الجزء الظاهر في الصورة (يحسّن دقة Pl@ntNet)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {ORGAN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOrgan(option.value)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs transition-colors',
                      organ === option.value
                        ? 'bg-emerald-300 text-emerald-950'
                        : 'bg-white/10 text-emerald-100/80 hover:bg-white/15',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {phase === 'preview' && preview ? (
            <>
              <p className="text-center text-xs text-emerald-100/70">
                راجع المعاينة ثم اضغط «تحليل الصورة» لإرسالها إلى Pl@ntNet
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  leftIcon={<RefreshCw className="size-4" />}
                  onClick={reset}
                >
                  إعادة
                </Button>
                <Button fullWidth onClick={() => void analyze()}>
                  تحليل الصورة
                </Button>
              </div>
            </>
          ) : phase === 'analyzing' ? null : (
            <>
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="touch-target inline-flex flex-col items-center justify-center gap-1 text-emerald-200/80 hover:text-white"
                >
                  <Upload className="size-5" aria-hidden />
                  <span className="text-xs">رفع</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleCapture()}
                  disabled={!camera.stream}
                  className={cn(
                    'flex size-[72px] items-center justify-center rounded-full border-[3px] border-emerald-200',
                    'bg-white/10 transition-transform active:scale-95',
                    'disabled:opacity-40',
                  )}
                  aria-label="التقاط صورة"
                >
                  <span className="size-14 rounded-full bg-emerald-200" />
                </button>

                <button
                  type="button"
                  onClick={() => void start()}
                  className="touch-target inline-flex flex-col items-center justify-center gap-1 text-emerald-200/80 hover:text-white"
                >
                  <Camera className="size-5" aria-hidden />
                  <span className="text-xs">كاميرا</span>
                </button>
              </div>
              <p className="text-center text-xs text-emerald-100/60">
                يمكنك أيضاً سحب صورة وإفلاتها داخل الإطار · أفضل النتائج مع
                إضاءة جيدة وقرب من الورقة
              </p>
            </>
          )}

          {phase === 'error' ? (
            <Button variant="secondary" fullWidth onClick={reset}>
              المحاولة من جديد
            </Button>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void setPreviewFromFile(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}
