import type {
  IdentifyImageOptions,
  PlantIdentificationCandidate,
  PlantIdentificationOutcome,
  PlantNetIdentifyResponse,
  PlantNetOrgan,
  PlantNetResult,
} from '@/types/plantnet'
import { ServiceError } from '@/services/errors'

const PLANTNET_BASE = 'https://my-api.plantnet.org/v2/identify'
const DEFAULT_PROJECT = 'all'
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

/** Hardcoded Pl@ntNet key — no env lookup (works on GitHub Pages without `.env`). */
const PLANTNET_API_KEY = '2b10d9WpUNeMmsuwvO7MLBaUu'

/** Always true — key is embedded in the service. */
export function isPlantNetConfigured(): boolean {
  return true
}

/**
 * Validate image file before sending to Pl@ntNet.
 * Throws ServiceError with Arabic messages on failure.
 */
export function validatePlantImage(file: File): void {
  if (!(file instanceof File) || file.size <= 0) {
    throw new ServiceError(
      'لم يتم اختيار صورة صالحة. يرجى رفع صورة للنبات.',
      'INVALID_FILE',
    )
  }

  const mime = (file.type || '').toLowerCase()
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    throw new ServiceError(
      'صيغة الصورة غير مدعومة. استخدم JPEG أو PNG أو WebP.',
      'INVALID_FILE',
    )
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new ServiceError(
      'حجم الصورة كبير جداً. الحد الأقصى 5 ميغابايت.',
      'FILE_TOO_LARGE',
    )
  }
}

function mapCandidate(result: PlantNetResult): PlantIdentificationCandidate | null {
  const scientificName =
    result.species.scientificNameWithoutAuthor?.trim() ||
    result.species.scientificName?.trim()

  if (!scientificName) return null

  const gbifId = result.gbif?.id
  const taxonId =
    gbifId === undefined || gbifId === null ? null : String(gbifId)

  const score = typeof result.score === 'number' ? result.score : 0

  return {
    scientificName,
    scientificNameAuthorship:
      result.species.scientificNameAuthorship?.trim() || null,
    commonNames: (result.species.commonNames ?? []).filter(
      (name): name is string => Boolean(name?.trim()),
    ),
    family: result.species.family?.scientificNameWithoutAuthor?.trim() || null,
    genus: result.species.genus?.scientificNameWithoutAuthor?.trim() || null,
    score,
    taxonId,
  }
}

function parsePlantNetPayload(
  payload: PlantNetIdentifyResponse,
  maxResults: number,
): PlantIdentificationOutcome {
  const candidates = (payload.results ?? [])
    .map(mapCandidate)
    .filter((item): item is PlantIdentificationCandidate => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  if (candidates.length === 0) {
    return {
      ok: false,
      code: 'NO_RESULTS',
      message:
        'تعذّر التعرف على النبات من الصورة. جرّب صورة أوضح للورقة أو الزهرة بإضاءة جيدة.',
    }
  }

  return {
    ok: true,
    bestMatch: payload.bestMatch?.trim() || candidates[0]?.scientificName || null,
    candidates,
    identifiedAt: new Date().toISOString(),
  }
}

function buildIdentifyUrl(project: string): string {
  // Auth must be a query param (not a header), per Pl@ntNet docs:
  // https://my-api.plantnet.org/v2/identify/all?api-key=…
  const url = new URL(`${PLANTNET_BASE}/${encodeURIComponent(project)}`)
  url.searchParams.set('api-key', PLANTNET_API_KEY)
  return url.toString()
}

function extractErrorFields(data: unknown): string {
  if (data == null) return ''
  if (typeof data === 'string') return data.trim()
  if (typeof data !== 'object') return String(data)

  const record = data as Record<string, unknown>
  const parts: string[] = []

  for (const key of ['message', 'error', 'status', 'statusMessage', 'detail'] as const) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      parts.push(value.trim())
    } else if (typeof value === 'number') {
      parts.push(String(value))
    }
  }

  if (parts.length > 0) return parts.join(' | ')
  try {
    return JSON.stringify(data)
  } catch {
    return ''
  }
}

function localizeApiDetail(
  rawBody: string,
  status: number,
  statusText: string,
): string {
  const lower = rawBody.toLowerCase()
  const technical = [
    `HTTP ${status}${statusText ? ` ${statusText}` : ''}`,
    rawBody.trim() || null,
  ]
    .filter(Boolean)
    .join(' — ')

  if (
    status === 0 ||
    lower.includes('cors') ||
    lower.includes('failed to fetch')
  ) {
    return [
      'فشل الاتصال بـ Pl@ntNet (غالباً CORS).',
      'فعّل "Expose my API key" وأضف نطاق GitHub Pages في Authorized domains على my.plantnet.org.',
      technical,
    ].join(' ')
  }

  if (status === 401 || status === 403 || lower.includes('api key')) {
    return [
      'رفض Pl@ntNet المصادقة (401/403).',
      'تأكد أن المفتاح صالح وأن النطاق مُصرّح في إعدادات API.',
      technical,
    ].join(' ')
  }

  if (status === 429 || lower.includes('quota') || lower.includes('rate')) {
    return `تم تجاوز حد طلبات التعريف. ${technical}`
  }

  if (status >= 500) {
    return `خدمة التعريف غير متاحة حالياً. ${technical}`
  }

  return `فشل طلب التعريف. ${technical}`
}

async function readApiErrorMessage(response: Response): Promise<string> {
  let rawBody = ''

  try {
    rawBody = await response.text()
  } catch (error) {
    console.error('[PlantNet] failed to read error body:', error)
    rawBody = ''
  }

  let parsedHint = ''
  if (rawBody.trim()) {
    try {
      parsedHint = extractErrorFields(JSON.parse(rawBody) as unknown)
    } catch {
      parsedHint = rawBody.trim()
    }
  }

  const detail = localizeApiDetail(
    parsedHint || rawBody,
    response.status,
    response.statusText,
  )

  console.error('[PlantNet] identify failed', {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    body: rawBody,
    parsed: parsedHint || null,
  })

  return detail
}

/**
 * Identify a plant image via the Pl@ntNet public API.
 * Returns structured candidates with confidence scores and scientific names.
 */
export async function identifyPlantWithPlantNet(
  file: File,
  options: IdentifyImageOptions = {},
): Promise<PlantIdentificationOutcome> {
  try {
    validatePlantImage(file)
  } catch (error) {
    if (error instanceof ServiceError) {
      return {
        ok: false,
        code: error.code === 'FILE_TOO_LARGE' ? 'FILE_TOO_LARGE' : 'INVALID_FILE',
        message: error.message,
      }
    }
    return {
      ok: false,
      code: 'INVALID_FILE',
      message: 'تعذّر التحقق من ملف الصورة.',
    }
  }

  const project = options.project?.trim() || DEFAULT_PROJECT
  const organ: PlantNetOrgan = options.organ ?? 'auto'
  const maxResults = options.maxResults ?? 5

  const formData = new FormData()
  formData.append('images', file, file.name || 'plant.jpg')
  formData.append('organs', organ)

  // Exact pattern: …/v2/identify/all?api-key=2b10d9WpUNeMmsuwvO7MLBaUu
  const url = buildIdentifyUrl(project)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Do not set Authorization / api-key headers — Pl@ntNet expects query param only.
    })
  } catch (error) {
    const networkDetail =
      error instanceof Error ? error.message : String(error ?? 'unknown')
    console.error('[PlantNet] network/CORS error', { url, error })
    return {
      ok: false,
      code: 'NETWORK',
      message: [
        'تعذّر الاتصال بخدمة التعريف.',
        'إن ظهرت مشكلة CORS: فعّل "Expose my API key" وأضف نطاق GitHub Pages في Authorized domains.',
        `التفاصيل: ${networkDetail}`,
      ].join(' '),
    }
  }

  if (!response.ok) {
    const detail = await readApiErrorMessage(response)
    return {
      ok: false,
      code: 'API_ERROR',
      message: detail,
    }
  }

  let payload: PlantNetIdentifyResponse
  try {
    const text = await response.text()
    payload = JSON.parse(text) as PlantNetIdentifyResponse
  } catch (error) {
    console.error('[PlantNet] invalid JSON success body:', error)
    return {
      ok: false,
      code: 'API_ERROR',
      message: 'استجابة غير صالحة من خدمة التعريف (تعذّر قراءة JSON).',
    }
  }

  return parsePlantNetPayload(payload, maxResults)
}

/**
 * Validate + identify from a File; throws ServiceError with Arabic message on failure.
 */
export async function identifyPlantOrThrow(
  file: File,
  options?: IdentifyImageOptions,
): Promise<Extract<PlantIdentificationOutcome, { ok: true }>> {
  const outcome = await identifyPlantWithPlantNet(file, options)
  if (!outcome.ok) {
    throw new ServiceError(outcome.message, outcome.code)
  }
  return outcome
}

/** Confidence as a 0–100 percentage for UI display. */
export function confidencePercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.round(Math.min(Math.max(score, 0), 1) * 100)
}
