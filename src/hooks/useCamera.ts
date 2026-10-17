import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'

interface UseCameraResult {
  videoRef: RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  error: string | null
  starting: boolean
  supported: boolean
  start: () => Promise<void>
  stop: () => void
  capture: () => string | null
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const supported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)

  const stop = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop())
      return null
    })
  }, [])

  const start = useCallback(async () => {
    if (!supported) {
      setError('الكاميرا غير مدعومة على هذا الجهاز')
      return
    }

    setStarting(true)
    setError(null)

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      setStream(media)
      if (videoRef.current) {
        videoRef.current.srcObject = media
        await videoRef.current.play()
      }
    } catch {
      setError(
        'تعذّر الوصول إلى الكاميرا. يمكنك رفع صورة من المعرض بدلاً من ذلك.',
      )
    } finally {
      setStarting(false)
    }
  }, [supported])

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video || !stream) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const context = canvas.getContext('2d')
    if (!context) return null

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.92)
  }, [stream])

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [stream])

  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream
      void videoRef.current.play()
    }
  }, [stream])

  return {
    videoRef,
    stream,
    error,
    starting,
    supported,
    start,
    stop,
    capture,
  }
}
