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

const VALID_ORGANS = new Set<PlantNetOrgan>([
  'auto',
  'leaf',
  'flower',
  'fruit',
  'bark',
  'habit',
  'other',
])

/** Hardcoded Pl@ntNet key — query param only (no env / no proxy). */
const PLANTNET_API_KEY = '2b10d9WpUNeMmsuwvO7MLBaUu'

const ARABIC_SCRIPT = /[\u0600-\u06FF]/

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

/** Normalize a single organ value from UI / options. */
export function normalizeOrgan(value: unknown): PlantNetOrgan {
  if (typeof value === 'string' && VALID_ORGANS.has(value as PlantNetOrgan)) {
    return value as PlantNetOrgan
  }
  return 'auto'
}

/**
 * Resolve organs for the multipart body.
 * - Explicit `organs[]` wins when provided.
 * - Else single `organ` from user selection (default `auto`).
 */
export function resolveOrgans(options: IdentifyImageOptions = {}): PlantNetOrgan[] {
  if (options.organs?.length) {
    const cleaned = options.organs.map(normalizeOrgan)
    return cleaned.length > 0 ? cleaned : ['auto']
  }
  return [normalizeOrgan(options.organ)]
}

/** Prefer Arabic common names, then remaining unique names from Pl@ntNet. */
function orderCommonNames(names: string[]): string[] {
  const cleaned = names.map((name) => name.trim()).filter(Boolean)
  const arabic = cleaned.filter((name) => ARABIC_SCRIPT.test(name))
  const other = cleaned.filter((name) => !ARABIC_SCRIPT.test(name))
  const seen = new Set<string>()
  const ordered: string[] = []

  for (const name of [...arabic, ...other]) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    ordered.push(name)
  }

  return ordered
}

function mapCandidate(result: PlantNetResult): PlantIdentificationCandidate | null {
  const scientificName =
    result.species?.scientificNameWithoutAuthor?.trim() ||
    result.species?.scientificName?.trim() ||
    ''

  if (!scientificName) return null

  const gbifId = result.gbif?.id
  const taxonId =
    gbifId === undefined || gbifId === null ? null : String(gbifId)

  const score =
    typeof result.score === 'number' && Number.isFinite(result.score)
      ? result.score
      : 0

  return {
    scientificName,
    scientificNameAuthorship:
      result.species?.scientificNameAuthorship?.trim() || null,
    commonNames: orderCommonNames(result.species?.commonNames ?? []),
    family: result.species?.family?.scientificNameWithoutAuthor?.trim() || null,
    genus: result.species?.genus?.scientificNameWithoutAuthor?.trim() || null,
    score,
    taxonId,
  }
}

/**
 * Strict mapping of the live Pl@ntNet `results` array (API order preserved).
 * Primary candidate is always `results[0]` when present.
 */
function parsePlantNetPayload(
  payload: PlantNetIdentifyResponse,
  maxResults: number,
): PlantIdentificationOutcome {
  const rawResults = Array.isArray(payload.results) ? payload.results : []
  const candidates = rawResults
    .map(mapCandidate)
    .filter((item): item is PlantIdentificationCandidate => item !== null)
    .slice(0, Math.max(1, maxResults))

  if (candidates.length === 0) {
    return {
      ok: false,
      code: 'NO_RESULTS',
      message:
        'تعذّر التعرف على النبات من الصورة. جرّب صورة أوضح للورقة أو الزهرة بإضاءة جيدة.',
    }
  }

  const primary = candidates[0]

  return {
    ok: true,
    bestMatch: payload.bestMatch?.trim() || primary.scientificName,
    candidates,
    identifiedAt: new Date().toISOString(),
  }
}

/** Primary scientific name + Arabic commons + confidence % from `results[0]`. */
export function summarizePrimaryCandidate(
  outcome: Extract<PlantIdentificationOutcome, { ok: true }>,
): {
  scientificName: string
  commonArabicNames: string[]
  confidencePercent: number
} {
  const primary = outcome.candidates[0]
  const scientificName =
    primary?.scientificName || outcome.bestMatch || 'غير معروف'
  const commonArabicNames = (primary?.commonNames ?? []).filter((name) =>
    ARABIC_SCRIPT.test(name),
  )
  return {
    scientificName,
    commonArabicNames,
    confidencePercent: confidencePercent(primary?.score ?? 0),
  }
}

/**
 * Official endpoint, e.g.
 * https://my-api.plantnet.org/v2/identify/all?api-key=2b10d9WpUNeMmsuwvO7MLBaUu
 */
function buildIdentifyUrl(project: string): string {
  const url = new URL(`${PLANTNET_BASE}/${encodeURIComponent(project)}`)
  url.searchParams.set('api-key', PLANTNET_API_KEY)
  url.searchParams.set('lang', 'ar')
  return url.toString()
}

function appendOrgans(formData: FormData, organs: PlantNetOrgan[]): void {
  if (organs.length <= 1) {
    formData.append('organs', organs[0] ?? 'auto')
    return
  }
  for (const organ of organs) {
    formData.append('organs', organ)
  }
}

async function readErrorDetail(response: Response): Promise<string> {
  let raw = ''
  try {
    raw = await response.text()
  } catch {
    raw = ''
  }

  let detail = raw.trim().slice(0, 300)
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const message =
        (typeof parsed.message === 'string' && parsed.message) ||
        (typeof parsed.error === 'string' && parsed.error) ||
        ''
      if (message) detail = message
    } catch {
      /* keep raw text */
    }
  }

  const lower = detail.toLowerCase()
  if (response.status === 401 || response.status === 403) {
    if (lower.includes('origin') || lower.includes('cors')) {
      return [
        'رفض Pl@ntNet الطلب بسبب CORS / النطاق.',
        'تأكد أن نطاق GitHub Pages مضاف في Authorized domains وأن Expose my API key مفعّل.',
        detail ? `(${detail})` : `HTTP ${response.status}`,
      ].join(' ')
    }
    return `مفتاح Pl@ntNet مرفوض (HTTP ${response.status})${detail ? `: ${detail}` : ''}`
  }
  if (response.status === 429) {
    return 'تم تجاوز حد طلبات التعريف. حاول مرة أخرى لاحقاً.'
  }
  if (response.status >= 500) {
    return 'خدمة التعريف غير متاحة حالياً. حاول مرة أخرى بعد قليل.'
  }
  return `فشل طلب التعريف (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''})${detail ? `: ${detail}` : ''}`
}

/**
 * Identify a plant image via the official Pl@ntNet API (direct browser fetch).
 * Uses FormData only — no custom headers (avoids unnecessary CORS preflight).
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
  const organs = resolveOrgans(options)
  const maxResults = options.maxResults ?? 5

  const formData = new FormData()
  formData.append('images', file, file.name || 'plant.jpg')
  appendOrgans(formData, organs)

  // Direct official URL — no third-party CORS proxy.
  const url = buildIdentifyUrl(project)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Intentionally omit headers: browser sets multipart boundary automatically.
      // Custom Content-Type / Authorization would force a CORS preflight.
    })
  } catch (error) {
    console.error('[PlantNet] network error', { url, error })
    return {
      ok: false,
      code: 'NETWORK',
      message:
        'تعذّر الاتصال بخدمة التعريف. تحقق من اتصال الإنترنت أو إعدادات CORS على my.plantnet.org.',
    }
  }

  if (!response.ok) {
    const message = await readErrorDetail(response)
    console.error('[PlantNet] API error', {
      status: response.status,
      statusText: response.statusText,
      url,
      message,
    })
    return {
      ok: false,
      code: 'API_ERROR',
      message,
    }
  }

  let payload: PlantNetIdentifyResponse
  try {
    payload = (await response.json()) as PlantNetIdentifyResponse
  } catch (error) {
    console.error('[PlantNet] invalid JSON body', error)
    return {
      ok: false,
      code: 'API_ERROR',
      message: 'استجابة غير صالحة من خدمة التعريف.',
    }
  }

  const outcome = parsePlantNetPayload(payload, maxResults)
  if (outcome.ok) {
    console.info('[PlantNet] mapped results[0]', summarizePrimaryCandidate(outcome))
  }
  return outcome
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

/** Confidence as a 0–100 percentage for UI display (from Pl@ntNet score 0–1). */
export function confidencePercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.round(Math.min(Math.max(score, 0), 1) * 100)
}
