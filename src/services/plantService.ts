import type {
  IdentifyImageOptions,
  NormalizedPlantMatch,
  PlantIdentificationCandidate,
  PlantIdentificationOutcome,
  PlantIdentificationPrimarySummary,
  PlantNetIdentifyResponse,
  PlantNetResult,
} from '@/types/identification'
import { ServiceError } from '@/services/errors'
import { compressImageForUpload } from '@/services/imageUtils'
import { extractBinomialScientificName } from '@/lib/scientificName'
import {
  buildCareInfo,
  buildHealthProfile,
  buildOverviewDescription,
  careInfoToGuide,
} from '@/services/plantProfile'

export {
  buildCareInfo,
  buildHealthProfile,
  buildOverviewDescription,
} from '@/services/plantProfile'
// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Frontend identify endpoint — local Vercel serverless proxy only.
 * Never call my-api.plantnet.org from the browser; never send an API key from the client.
 * The key lives only in server env `PLANTNET_API_KEY` (`api/identify.js` / Vite Node proxy).
 */
const IDENTIFY_API_URL = '/api/identify' as const

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_SOURCE_BYTES = 25 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

const ARABIC_SCRIPT = /[\u0600-\u06FF]/
const DEFAULT_MAX_RESULTS = 5

export const PLANTNET_UNRECOGNIZED_MESSAGE =
  'لم يتم التعرف على النبات بدقة. يرجى رفع صورة واضحة ومقربة لأوراق أو زهور النبتة.'

// ─── Public helpers ──────────────────────────────────────────────────────────

export function isPlantNetApiConfigured(): boolean {
  // Identify always goes through the serverless proxy; key lives on the server.
  return true
}

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

  if (file.size > MAX_SOURCE_BYTES) {
    throw new ServiceError(
      'حجم الصورة كبير جداً. الحد الأقصى 25 ميغابايت قبل الضغط.',
      'FILE_TOO_LARGE',
    )
  }
}

export function displayPlantCommonName(
  candidate: PlantIdentificationCandidate | null | undefined,
  scientificFallback?: string | null,
): string {
  const named =
    candidate?.commonName?.trim() ||
    candidate?.name?.trim() ||
    candidate?.commonNames?.[0]?.trim()
  if (named) return named

  const scientific =
    candidate?.scientificName?.trim() || scientificFallback?.trim() || ''
  if (scientific) return scientific

  return 'نتيجة التعريف'
}

export function confidencePercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  if (score > 1) return Math.round(Math.min(Math.max(score, 0), 100))
  return Math.round(Math.min(Math.max(score, 0), 1) * 100)
}

export function summarizePrimaryCandidate(
  outcome: Extract<PlantIdentificationOutcome, { ok: true }>,
): PlantIdentificationPrimarySummary {
  const primary = outcome.candidates?.[0]
  const name =
    primary?.commonName?.trim() ||
    primary?.name?.trim() ||
    primary?.commonNames?.[0]?.trim() ||
    primary?.scientificName?.trim() ||
    outcome.bestMatch?.trim() ||
    ''
  const scientificName =
    primary?.scientificName?.trim() || outcome.bestMatch?.trim() || name
  const commonNames =
    primary?.commonNames && primary.commonNames.length > 0
      ? primary.commonNames
      : name
        ? [name]
        : []
  const score = primary?.score ?? 0

  return {
    name,
    scientificName,
    commonNames,
    commonArabicNames: commonNames.filter((n) => ARABIC_SCRIPT.test(n ?? '')),
    family: primary?.family ?? null,
    confidencePercent: primary?.confidencePercent ?? confidencePercent(score),
    score,
    description: primary?.description ?? null,
    watering: primary?.watering ?? null,
    light: primary?.light ?? null,
    temperature: primary?.temperature ?? null,
    soil: primary?.soil ?? null,
    humidity: primary?.humidity ?? primary?.careInfo?.humidity ?? null,
    propagation: primary?.propagation ?? primary?.careInfo?.propagation ?? null,
    fertilizer: primary?.fertilizer ?? primary?.careInfo?.fertilizer ?? null,
    isPlant: outcome.isPlant,
    message: outcome.message,
  }
}

// ─── Response mapping ────────────────────────────────────────────────────────

function readOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Force-map a Pl@ntNet result row. Prefer commonNames[0]; if empty, use
 * scientificNameWithoutAuthor as the primary display title.
 */
function mapResultToCandidate(result: PlantNetResult): PlantIdentificationCandidate | null {
  const species = result.species
  if (!species || typeof species !== 'object') {
    console.warn('[Pl@ntNet] result missing species', result)
    return null
  }

  const commonNames = (Array.isArray(species.commonNames) ? species.commonNames : [])
    .map((n) => (typeof n === 'string' ? n.trim() : ''))
    .filter(Boolean)

  const rawScientific =
    readOptionalString(species.scientificNameWithoutAuthor) ||
    readOptionalString(species.scientificName) ||
    ''

  const scientificName = rawScientific
    ? extractBinomialScientificName(rawScientific) || rawScientific
    : ''

  // Fallback display: scientific name when commonNames is empty
  const commonName = commonNames[0] || scientificName
  if (!commonName) {
    console.warn('[Pl@ntNet] result has no common or scientific name', species)
    return null
  }

  const resolvedScientific = scientificName || commonName

  const family =
    readOptionalString(species.family?.scientificNameWithoutAuthor) ||
    readOptionalString(species.family?.scientificName) ||
    'غير محدد'
  const genus =
    readOptionalString(species.genus?.scientificNameWithoutAuthor) ||
    readOptionalString(species.genus?.scientificName) ||
    (resolvedScientific.includes(' ')
      ? resolvedScientific.split(/\s+/)[0] ?? null
      : null)

  const score =
    typeof result.score === 'number' && Number.isFinite(result.score)
      ? Math.min(Math.max(result.score, 0), 1)
      : 0
  const confidence = Math.round(score * 100)

  const profileParams = {
    scientificName: resolvedScientific,
    family,
    genus,
  }
  const careInfo = buildCareInfo(profileParams)
  const health = buildHealthProfile(profileParams)
  const overview = buildOverviewDescription({
    commonName,
    scientificName: resolvedScientific,
    family,
    care: careInfo,
  })

  return {
    name: commonName,
    commonName,
    scientificName: resolvedScientific,
    scientificNameAuthorship:
      readOptionalString(species.scientificNameAuthorship),
    commonNames: commonNames.length > 0 ? commonNames : [commonName],
    family,
    genus,
    score,
    confidencePercent: confidence,
    taxonId: null,
    description: overview,
    overview,
    watering: careInfo.watering,
    wateringSchedule: careInfo.wateringSchedule,
    moistureNeeds: careInfo.moistureNeeds,
    light: careInfo.light,
    temperature: careInfo.temperature,
    humidity: careInfo.humidity,
    soil: careInfo.soil,
    fertilizer: careInfo.fertilizer,
    propagation: careInfo.propagation,
    environment: null,
    careGuide: careInfoToGuide(careInfo),
    careInfo,
    health,
    healthStatus: `${confidence}%`,
    detailUrl: null,
  }
}

function toNormalizedMatch(
  candidate: PlantIdentificationCandidate,
): NormalizedPlantMatch {
  return {
    commonName: candidate.commonName || candidate.name,
    scientificName: candidate.scientificName,
    confidence: candidate.confidencePercent,
    family: candidate.family || 'غير محدد',
    careInfo: candidate.careInfo,
    health: candidate.health,
  }
}

/** Normalize Pl@ntNet payload: prefer `data.results`, else treat array body as results. */
function extractResultsList(data: unknown): PlantNetResult[] {
  if (Array.isArray(data)) {
    return data as PlantNetResult[]
  }
  if (data && typeof data === 'object') {
    const record = data as PlantNetIdentifyResponse & Record<string, unknown>
    if (Array.isArray(record.results)) {
      return record.results
    }
  }
  return []
}

function formatVisibleError(error: unknown, fallbackStatus?: string): string {
  if (error instanceof ServiceError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message?.trim() || error.name || 'Unknown Error'
  }
  if (typeof error === 'string' && error.trim()) return error.trim()
  if (fallbackStatus) return fallbackStatus
  return PLANTNET_UNRECOGNIZED_MESSAGE
}

function mapPlantNetResponse(
  payload: unknown,
  maxResults: number,
): Extract<PlantIdentificationOutcome, { ok: true }> | Extract<
  PlantIdentificationOutcome,
  { ok: false }
> {
  const results = extractResultsList(payload)

  console.log('[Pl@ntNet] results length:', results.length)

  if (results.length === 0) {
    return {
      ok: false,
      code: 'NO_RESULTS',
      message: PLANTNET_UNRECOGNIZED_MESSAGE,
    }
  }

  // Take results[0] (highest score) — map common / scientific name + care info
  const first = mapResultToCandidate(results[0]!)
  if (!first) {
    console.warn('[Pl@ntNet] results[0] mapping failed', results[0])
    return {
      ok: false,
      code: 'NO_RESULTS',
      message: PLANTNET_UNRECOGNIZED_MESSAGE,
    }
  }

  const rest = results
    .slice(1)
    .map((result) => mapResultToCandidate(result))
    .filter((c): c is PlantIdentificationCandidate => Boolean(c))

  const candidates = [first, ...rest].slice(0, Math.max(1, maxResults))

  console.log('[Pl@ntNet] top match', {
    commonName: first.commonName,
    scientificName: first.scientificName,
    confidence: first.confidencePercent,
    family: first.family,
  })

  return {
    ok: true,
    isPlant: true,
    message: null,
    bestMatch: first.scientificName,
    primary: toNormalizedMatch(first),
    candidates,
    identifiedAt: new Date().toISOString(),
  }
}

function failure(
  code: Extract<PlantIdentificationOutcome, { ok: false }>['code'],
  message: string = PLANTNET_UNRECOGNIZED_MESSAGE,
): Extract<PlantIdentificationOutcome, { ok: false }> {
  return { ok: false, code, message }
}

function extractApiErrorMessage(
  status: number,
  statusText: string,
  bodyText: string,
  parsed: unknown,
): string {
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>
    for (const key of ['message', 'error', 'detail', 'title']) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) {
        // PlantNet often returns "Species not found" / similar → clean Arabic UX
        if (/not found|no result|species/i.test(value)) {
          return PLANTNET_UNRECOGNIZED_MESSAGE
        }
        return value.trim()
      }
    }
  }
  if (status === 404) {
    return PLANTNET_UNRECOGNIZED_MESSAGE
  }
  const snippet = bodyText.trim().slice(0, 200)
  if (snippet) {
    return `خطأ من Pl@ntNet (HTTP ${status}): ${snippet}`
  }
  return `خطأ من Pl@ntNet (HTTP ${status} ${statusText || ''})`.trim()
}

// ─── API call (via Vercel serverless proxy — no browser CORS) ────────────────

async function callPlantNetIdentify(
  imageFile: File,
  organ: string,
): Promise<PlantNetIdentifyResponse | PlantNetResult[]> {
  // Guard: never allow accidental direct Pl@ntNet calls from the client bundle
  if (/plantnet\.org/i.test(IDENTIFY_API_URL)) {
    throw new ServiceError(
      'إعداد غير آمن: يجب أن يمر التعريف عبر /api/identify فقط.',
      'API_ERROR',
    )
  }

  const form = new FormData()
  form.append('images', imageFile, imageFile.name || 'plant.jpg')
  form.append('organs', organ)

  console.log('[Identify] POST /api/identify (serverless proxy)', {
    endpoint: IDENTIFY_API_URL,
    organ,
    fileName: imageFile.name,
    fileSize: imageFile.size,
  })

  let response: Response
  try {
    // POST FormData only — no api-key query/header; proxy adds the key server-side.
    response = await fetch('/api/identify', {
      method: 'POST',
      body: form,
      // Do NOT set Content-Type — browser sets multipart boundary
    })
  } catch (error) {
    console.error('[Identify] network error calling /api/identify:', error)
    throw new ServiceError(
      `تعذّر الاتصال بخدمة التعريف (/api/identify): ${formatVisibleError(error)}`,
      'NETWORK',
    )
  }

  const bodyText = await response.text()
  console.log('[Pl@ntNet] HTTP status:', response.status, response.statusText)

  let data: unknown = null
  try {
    data = bodyText ? JSON.parse(bodyText) : null
  } catch (error) {
    console.error('[Pl@ntNet] JSON parse error:', error, bodyText.slice(0, 300))
    throw new ServiceError(PLANTNET_UNRECOGNIZED_MESSAGE, 'API_ERROR')
  }

  console.log('API Raw Response:', data)

  // Proxy-level error payload: { error: "..." }
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'string' &&
    extractResultsList(data).length === 0
  ) {
    throw new ServiceError(
      (data as { error: string }).error,
      response.status >= 500 ? 'API_ERROR' : 'API_ERROR',
    )
  }

  const results = extractResultsList(data)

  if (!response.ok && results.length === 0) {
    throw new ServiceError(
      extractApiErrorMessage(
        response.status,
        response.statusText,
        bodyText,
        data,
      ),
      'API_ERROR',
    )
  }

  if (Array.isArray(data)) {
    return data as PlantNetResult[]
  }

  return (data ?? { results }) as PlantNetIdentifyResponse
}

// ─── Public identify ─────────────────────────────────────────────────────────

/**
 * Identify a plant image via `/api/identify` (Vercel serverless → Pl@ntNet).
 */
export async function identifyPlant(
  file: File,
  options: IdentifyImageOptions = {},
): Promise<PlantIdentificationOutcome> {
  try {
    validatePlantImage(file)
  } catch (error) {
    console.error('Plant Identification Error:', error)
    if (error instanceof ServiceError) {
      return failure(
        error.code === 'FILE_TOO_LARGE' ? 'FILE_TOO_LARGE' : 'INVALID_FILE',
        error.message,
      )
    }
    return failure('INVALID_FILE', formatVisibleError(error))
  }

  let uploadFile: File
  try {
    uploadFile = await compressImageForUpload(file, {
      maxBytes: 1024 * 1024,
      maxDimension: 1600,
      initialQuality: 0.82,
      mimeType: 'image/jpeg',
    })
  } catch (error) {
    console.error('Plant Identification Error:', error)
    return failure('INVALID_FILE', 'تعذّر تجهيز الصورة. جرّب صورة أصغر.')
  }

  if (uploadFile.size > MAX_UPLOAD_BYTES) {
    return failure(
      'FILE_TOO_LARGE',
      'الصورة كبيرة بعد الضغط. جرّب التقاطاً أقرب أو دقة أقل.',
    )
  }

  const organ = options.organ ?? 'auto'
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS

  try {
    const payload = await callPlantNetIdentify(uploadFile, organ)
    const outcome = mapPlantNetResponse(payload, maxResults)

    console.log('[Pl@ntNet] mapped outcome', {
      ok: outcome.ok,
      summary: outcome.ok ? summarizePrimaryCandidate(outcome) : outcome,
    })

    return outcome
  } catch (error) {
    console.error('Plant Identification Error:', error)
    if (error instanceof ServiceError) {
      return failure(
        error.code === 'NETWORK' || error.code === 'API_ERROR'
          ? error.code
          : 'API_ERROR',
        error.message || PLANTNET_UNRECOGNIZED_MESSAGE,
      )
    }
    return failure('API_ERROR', PLANTNET_UNRECOGNIZED_MESSAGE)
  }
}

export async function identifyPlantOrThrow(
  file: File,
  options?: IdentifyImageOptions,
): Promise<Extract<PlantIdentificationOutcome, { ok: true }>> {
  const outcome = await identifyPlant(file, options)
  if (!outcome.ok) {
    throw new ServiceError(outcome.message, outcome.code === 'LOW_CONFIDENCE' ? 'NO_RESULTS' : outcome.code)
  }
  return outcome
}
