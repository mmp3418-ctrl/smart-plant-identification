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
