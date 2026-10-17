import { useEffect, useRef, useState } from 'react'
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
import { useCamera } from '@/hooks/useCamera'
import { useAppData } from '@/context/AppDataContext'
import { fileToDataUrl, identifyPlantFromImage } from '@/services/identify'
import { cn } from '@/lib/cn'

type Phase = 'ready' | 'preview' | 'analyzing' | 'error'

export function IdentifyPage() {
  const [searchParams] = useSearchParams()
  const preferUpload = searchParams.get('mode') === 'upload'
  const navigate = useNavigate()
  const { addHistory } = useAppData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const camera = useCamera()

  const [phase, setPhase] = useState<Phase>('ready')
  const [preview, setPreview] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { start, stop } = camera

  useEffect(() => {
    if (!preferUpload) {
      void start()
    }
    return () => stop()
  }, [preferUpload, start, stop])

  async function analyze(imageDataUrl: string) {
    setPhase('analyzing')
    setErrorMessage(null)
    try {
      const result = await identifyPlantFromImage(imageDataUrl)
      addHistory({
        plantId: result.plant.id,
        plantName: result.plant.arabicName,
        scientificName: result.plant.scientificName,
        confidence: result.confidence,
        imagePreview: imageDataUrl,
      })
      navigate(`/plants/${result.plant.id}?identified=1&c=${result.confidence.toFixed(2)}`)
    } catch {
      setPhase('error')
      setErrorMessage('تعذّر تحليل الصورة. حاول مرة أخرى بصورة أوضح.')
    }
  }

  async function handleCapture() {
    const shot = camera.capture()
    if (!shot) {
      setPhase('error')
      setErrorMessage('لم يتم التقاط إطار صالح. تأكد من تفعيل الكاميرا.')
      return
    }
    setPreview(shot)
    setPhase('preview')
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhase('error')
      setErrorMessage('يرجى اختيار ملف صورة صالح.')
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      setPreview(dataUrl)
      setPhase('preview')
      camera.stop()
    } catch {
      setPhase('error')
      setErrorMessage('فشل تحميل الصورة من الجهاز.')
    }
  }

  function reset() {
    setPreview(null)
    setPhase('ready')
    setErrorMessage(null)
    if (!preferUpload) void camera.start()
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-brand-dark text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="touch-target inline-flex items-center justify-center rounded-md text-sage hover:text-white"
          aria-label="إغلاق والعودة"
        >
          <X className="size-5" />
        </Link>
        <div className="text-center">
          <p className="text-sm font-bold">تعريف النبات</p>
          <p className="text-xs text-sage/80">وجّه العدسة نحو الورقة أو الزهرة</p>
        </div>
        <span className="touch-target inline-flex items-center justify-center text-sage">
          <Leaf className="size-5" aria-hidden />
        </span>
      </div>

      {/* Viewport */}
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-6 sm:px-6">
        <div className="relative flex-1 overflow-hidden rounded-lg bg-black/40 min-h-[52vh]">
          {preview ? (
            <img
              src={preview}
              alt="معاينة الصورة"
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
                <Spinner label="جارٍ تشغيل الكاميرا…" className="text-sage" />
              ) : (
                <>
                  <ImageIcon className="size-10 text-sage/70" strokeWidth={1.25} />
                  <p className="text-sm text-sage">
                    {camera.error ||
                      'الكاميرا غير متاحة. استخدم رفع صورة من المعرض.'}
                  </p>
                </>
              )}
            </div>
          ) : null}

          {/* Scan frame */}
          {phase !== 'analyzing' ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
              <div className="relative aspect-square w-[78%] max-w-[280px]">
                <span className="absolute start-0 top-0 h-8 w-8 border-s-2 border-t-2 border-sage" />
                <span className="absolute end-0 top-0 h-8 w-8 border-e-2 border-t-2 border-sage" />
                <span className="absolute start-0 bottom-0 h-8 w-8 border-s-2 border-b-2 border-sage" />
                <span className="absolute end-0 bottom-0 h-8 w-8 border-e-2 border-b-2 border-sage" />
                {!preview ? (
                  <span className="scan-line absolute inset-x-3 h-px bg-sage/80 shadow-[0_0_8px_rgba(197,220,196,0.6)]" />
                ) : null}
              </div>
            </div>
          ) : null}

          {phase === 'analyzing' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-brand-dark/75">
              <Spinner label="جارٍ تحليل النبات…" className="text-sage" />
              <p className="text-xs text-sage/70">قد يستغرق ذلك بضع ثوانٍ</p>
            </div>
          ) : null}
        </div>

        {phase === 'error' && errorMessage ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-md border border-danger/40 bg-danger-soft/10 px-3 py-3 text-sm text-[#fecaca]"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        {/* Controls */}
        <div className="mt-5 space-y-3">
          {phase === 'preview' && preview ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                fullWidth
                leftIcon={<RefreshCw className="size-4" />}
                onClick={reset}
              >
                إعادة
              </Button>
              <Button
                fullWidth
                loading={false}
                onClick={() => void analyze(preview)}
              >
                تحليل الصورة
              </Button>
            </div>
          ) : phase === 'analyzing' ? null : (
            <>
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="touch-target inline-flex flex-col items-center justify-center gap-1 text-sage hover:text-white"
                >
                  <Upload className="size-5" aria-hidden />
                  <span className="text-xs">رفع</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleCapture()}
                  disabled={!camera.stream}
                  className={cn(
                    'flex size-[72px] items-center justify-center rounded-full border-[3px] border-sage',
                    'bg-white/10 transition-transform active:scale-95',
                    'disabled:opacity-40',
                  )}
                  aria-label="التقاط صورة"
                >
                  <span className="size-14 rounded-full bg-sage" />
                </button>

                <button
                  type="button"
                  onClick={() => void camera.start()}
                  className="touch-target inline-flex flex-col items-center justify-center gap-1 text-sage hover:text-white"
                >
                  <Camera className="size-5" aria-hidden />
                  <span className="text-xs">كاميرا</span>
                </button>
              </div>
              <p className="text-center text-xs text-sage/70">
                للحصول على أفضل نتيجة: إطار قريب، إضاءة جيدة، خلفية بسيطة
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
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  )
}
