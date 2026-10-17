import { plants } from '@/data/plants'
import type { IdentificationResult } from '@/types/plant'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * Simulated plant identification.
 * Replace with a vision/ML API when the backend is ready.
 */
export async function identifyPlantFromImage(
  imageDataUrl: string,
): Promise<IdentificationResult> {
  await delay(1800 + Math.random() * 900)

  const ranked = [...plants].sort(() => Math.random() - 0.5)
  const plant = ranked[0]
  const confidence = 0.78 + Math.random() * 0.2

  return {
    plant,
    confidence: Math.min(confidence, 0.98),
    timestamp: new Date().toISOString(),
    sourceImage: imageDataUrl,
  }
}

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
