/**
 * Client-side image helpers: preview conversion + Canvas compression for Pl@ntNet.
 */

export interface CompressImageOptions {
  /** Target max file size in bytes (default 1 MB). */
  maxBytes?: number
  /** Longest edge in pixels (default 1600). */
  maxDimension?: number
  /** Starting JPEG quality 0–1 (default 0.82). */
  initialQuality?: number
  /** Output MIME type (default image/jpeg). */
  mimeType?: 'image/jpeg' | 'image/webp'
}

const DEFAULT_MAX_BYTES = 1024 * 1024 // 1 MB
const DEFAULT_MAX_DIMENSION = 1600
const DEFAULT_QUALITY = 0.82

/**
 * Convert a File to a data URL for live preview.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('تعذّر قراءة الملف'))
      }
    }
    reader.onerror = () => reject(new Error('فشل تحميل الصورة'))
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a data URL (e.g. camera capture) back to a File for API upload.
 */
export async function dataUrlToFile(
  dataUrl: string,
  filename = 'capture.jpg',
): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const type = blob.type || 'image/jpeg'
  return new File([blob], filename, { type })
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('تعذّر تحميل الصورة للضغط'))
    }
    image.src = url
  })
}

function computeTargetSize(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxDimension) {
    return { width, height }
  }
  const scale = maxDimension / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('فشل ضغط الصورة'))
        }
      },
      mimeType,
      quality,
    )
  })
}

function replaceExtension(filename: string, ext: string): string {
  const base = filename.replace(/\.[^.]+$/, '') || 'plant'
  return `${base}.${ext}`
}

/**
 * Compress / downscale an image with HTML5 Canvas before Pl@ntNet upload.
 * Heavy phone photos (8–15 MB) are scaled and JPEG-encoded to under `maxBytes`.
 * Returns the original file when it is already small enough and within dimensions.
 */
export async function compressImageForUpload(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION
  const mimeType = options.mimeType ?? 'image/jpeg'
  let quality = options.initialQuality ?? DEFAULT_QUALITY

  if (!(file instanceof File) || file.size <= 0) {
    throw new Error('ملف صورة غير صالح للضغط')
  }

  // Skip work when already small — still re-encode oversized dimensions later.
  const image = await loadImageElement(file)
  const { width, height } = computeTargetSize(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    maxDimension,
  )

  const needsResize =
    width < (image.naturalWidth || image.width) ||
    height < (image.naturalHeight || image.height)

  if (!needsResize && file.size <= maxBytes && file.type === mimeType) {
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('المتصفح لا يدعم ضغط الصور (Canvas)')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  let blob = await canvasToBlob(canvas, mimeType, quality)

  // Step quality down until under maxBytes (floor ~0.45)
  while (blob.size > maxBytes && quality > 0.45) {
    quality = Math.max(0.45, quality - 0.08)
    blob = await canvasToBlob(canvas, mimeType, quality)
  }

  // If still too large, shrink dimensions once more and re-encode
  if (blob.size > maxBytes) {
    const shrink = computeTargetSize(width, height, Math.floor(maxDimension * 0.75))
    canvas.width = shrink.width
    canvas.height = shrink.height
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, shrink.width, shrink.height)
    context.drawImage(image, 0, 0, shrink.width, shrink.height)
    quality = Math.min(quality, 0.7)
    blob = await canvasToBlob(canvas, mimeType, quality)

    while (blob.size > maxBytes && quality > 0.4) {
      quality = Math.max(0.4, quality - 0.07)
      blob = await canvasToBlob(canvas, mimeType, quality)
    }
  }

  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg'
  const filename = replaceExtension(file.name || 'plant.jpg', ext)

  return new File([blob], filename, {
    type: mimeType,
    lastModified: Date.now(),
  })
}
