import type {
  IdentifyImageOptions,
  PlantIdentificationCandidate,
  PlantIdentificationOutcome,
  PlantNetIdentifyResponse,
  PlantNetOrgan,
  PlantNetResult,
} from '@/types/plantnet'
import { ServiceError } from '@/services/errors'
import {
  missingEnvArabicMessage,
  readPlantNetApiKey,
} from '@/lib/env'

const PLANTNET_BASE = 'https://my-api.plantnet.org/v2/identify'
const DEFAULT_PROJECT = 'all'
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

function getPlantNetApiKey(): string {
  return readPlantNetApiKey()
}

/** Always true when public fallback or env key is available (GH Pages safe). */
export function isPlantNetConfigured(): boolean {
  return getPlantNetApiKey().length > 0
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

function localizeApiDetail(raw: string, status: number): string {
  const lower = raw.toLowerCase()
  if (status === 401 || status === 403 || lower.includes('api key')) {
    return 'مفتاح Pl@ntNet غير صالح أو غير مصرّح. تحقق من VITE_PLANTNET_API_KEY.'
  }
  if (status === 429 || lower.includes('quota') || lower.includes('rate')) {
    return 'تم تجاوز حد طلبات التعريف. حاول مرة أخرى لاحقاً.'
  }
  if (status >= 500) {
    return 'خدمة التعريف غير متاحة حالياً. حاول مرة أخرى بعد قليل.'
  }
  // Prefer Arabic wrapper; keep short technical hint only when useful
  if (raw.trim()) {
    return `فشل طلب التعريف: ${raw.trim()}`
  }
  return `فشل طلب التعريف (رمز ${status}).`
}

async function readApiErrorMessage(response: Response): Promise<string> {
  let raw = ''
  try {
    const data: unknown = await response.json()
    if (data && typeof data === 'object') {
      if (
        'message' in data &&
        typeof (data as { message: unknown }).message === 'string'
      ) {
        raw = (data as { message: string }).message
      } else if (
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
      ) {
        raw = (data as { error: string }).error
      }
    }
  } catch {
    /* ignore JSON parse errors */
  }

  return localizeApiDetail(raw, response.status)
}

/**
 * Identify a plant image via the Pl@ntNet public API.
 * Returns structured candidates with confidence scores and scientific names.
 */
export async function identifyPlantWithPlantNet(
  file: File,
  options: IdentifyImageOptions = {},
): Promise<PlantIdentificationOutcome> {
  const apiKey = getPlantNetApiKey()
  if (!apiKey) {
    // Extremely unlikely with public fallback — keep Arabic safety message
    return {
      ok: false,
      code: 'MISSING_API_KEY',
      message: missingEnvArabicMessage('VITE_PLANTNET_API_KEY'),
    }
  }

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

  const url = `${PLANTNET_BASE}/${encodeURIComponent(project)}?api-key=${encodeURIComponent(apiKey)}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
  } catch {
    return {
      ok: false,
      code: 'NETWORK',
      message:
        'تعذّر الاتصال بخدمة التعريف. تحقق من اتصال الإنترنت ثم أعد المحاولة.',
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
    payload = (await response.json()) as PlantNetIdentifyResponse
  } catch {
    return {
      ok: false,
      code: 'API_ERROR',
      message: 'استجابة غير صالحة من خدمة التعريف.',
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
