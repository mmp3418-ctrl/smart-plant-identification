import type {
  GeminiGenerateContentResponse,
  GeminiPlantJson,
  IdentifyImageOptions,
  PlantIdentificationCandidate,
  PlantIdentificationOutcome,
  PlantIdentificationPrimarySummary,
} from '@/types/identification'
import { ServiceError } from '@/services/errors'
import { compressImageForUpload } from '@/services/imageUtils'
import { extractBinomialScientificName } from '@/lib/scientificName'
import { readGeminiApiKey } from '@/lib/env'

// ─── Constants ───────────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-1.5-flash'
const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_SOURCE_BYTES = 25 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

const FALLBACK_COMMON_NAME = 'نبات غير محدد'
const FALLBACK_SCIENTIFIC_NAME = 'نبات غير محدد'
const ARABIC_SCRIPT = /[\u0600-\u06FF]/

const GEMINI_IDENTIFY_PROMPT = `You are an expert botanist. Identify the plant or flower in the image.

Return ONLY a valid JSON object (no markdown, no code fences, no extra text) with exactly these keys:
{
  "common_name": "common name in Arabic if known, otherwise English",
  "scientific_name": "Latin binomial scientific name (genus species) without author",
  "description": "short Arabic description of the plant and basic care tips",
  "health_status": "plant appearance / certainty, preferably include a confidence percent like 85%"
}

If you cannot identify the plant, still return the same JSON keys with best-effort values and a low confidence in health_status.`

// ─── Public helpers ──────────────────────────────────────────────────────────

function getGeminiApiKey(): string {
  return readGeminiApiKey().trim()
}

export function isGeminiApiConfigured(): boolean {
  return getGeminiApiKey().length > 0
}

/**
 * Validate image file before sending to Gemini.
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
  const firstCommon = candidate?.commonNames?.[0]?.trim()
  if (firstCommon) return firstCommon

  const scientific =
    candidate?.scientificName?.trim() || scientificFallback?.trim() || ''
  if (scientific) return scientific

  return FALLBACK_COMMON_NAME
}

export function confidencePercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.round(Math.min(Math.max(score, 0), 1) * 100)
}

export function summarizePrimaryCandidate(
  outcome: Extract<PlantIdentificationOutcome, { ok: true }>,
): PlantIdentificationPrimarySummary {
  const primary = outcome.candidates?.[0]
  const scientificName =
    primary?.scientificName?.trim() ||
    outcome.bestMatch?.trim() ||
    FALLBACK_SCIENTIFIC_NAME
  const commonNames =
    primary?.commonNames && primary.commonNames.length > 0
      ? primary.commonNames
      : [scientificName]
  const commonArabicNames = commonNames.filter((name) =>
    ARABIC_SCRIPT.test(name ?? ''),
  )
  const score = primary?.score ?? 0

  return {
    scientificName,
    commonNames,
    commonArabicNames,
    family: primary?.family ?? null,
    confidencePercent: confidencePercent(score),
    score,
    description: primary?.description ?? null,
    healthStatus: primary?.healthStatus ?? null,
  }
}

// ─── Internal: image → base64 + Gemini request ───────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function resolveMimeType(file: File): string {
  const mime = (file.type || '').toLowerCase()
  if (mime === 'image/jpg') return 'image/jpeg'
  if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp') {
    return mime
  }
  return 'image/jpeg'
}

function buildGeminiUrl(): string {
  const url = new URL(GEMINI_GENERATE_URL)
  url.searchParams.set('key', getGeminiApiKey())
  return url.toString()
}

function buildGeminiRequestBody(
  base64Image: string,
  mimeType: string,
): Record<string, unknown> {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          { text: GEMINI_IDENTIFY_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  }
}

// ─── Internal: parsing ───────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Pull a 0–100 confidence from free-text health_status when present. */
function parseConfidenceFromHealthStatus(healthStatus: string | null): number {
  if (!healthStatus) return 0.7
  const match = healthStatus.match(/(\d{1,3})\s*%/)
  if (match?.[1]) {
    const pct = Number.parseInt(match[1], 10)
    if (Number.isFinite(pct)) {
      return Math.min(Math.max(pct, 0), 100) / 100
    }
  }
  const lower = healthStatus.toLowerCase()
  if (
    lower.includes('high') ||
    lower.includes('عالي') ||
    lower.includes('مرتفع') ||
    lower.includes('مؤكد')
  ) {
    return 0.88
  }
  if (
    lower.includes('medium') ||
    lower.includes('متوسط') ||
    lower.includes('moderate')
  ) {
    return 0.65
  }
  if (
    lower.includes('low') ||
    lower.includes('منخفض') ||
    lower.includes('غير متأكد') ||
    lower.includes('uncertain')
  ) {
    return 0.4
  }
  return 0.7
}

function extractGeminiText(payload: GeminiGenerateContentResponse): string | null {
  const parts = payload.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return null

  const chunks: string[] = []
  for (const part of parts) {
    const text = readOptionalString(part?.text)
    if (text) chunks.push(text)
  }
  const joined = chunks.join('\n').trim()
  return joined.length > 0 ? joined : null
}

/** Strip markdown fences and isolate the JSON object. */
function cleanJsonText(raw: string): string {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1)
  }
  return text
}

function parseGeminiPlantJson(rawText: string): GeminiPlantJson | null {
  try {
    const parsed: unknown = JSON.parse(cleanJsonText(rawText))
    const record = asRecord(parsed)
    if (!record) return null
    return {
      common_name: readOptionalString(record.common_name) ?? undefined,
      scientific_name: readOptionalString(record.scientific_name) ?? undefined,
      description: readOptionalString(record.description) ?? undefined,
      health_status: readOptionalString(record.health_status) ?? undefined,
    }
  } catch {
    return null
  }
}

function mapGeminiPlantToCandidate(
  plant: GeminiPlantJson,
): PlantIdentificationCandidate {
  const commonName =
    readOptionalString(plant.common_name) || FALLBACK_COMMON_NAME
  const rawScientific =
    readOptionalString(plant.scientific_name) || commonName
  const scientificName =
    extractBinomialScientificName(rawScientific) || rawScientific
  const description = readOptionalString(plant.description)
  const healthStatus = readOptionalString(plant.health_status)
  const score = parseConfidenceFromHealthStatus(healthStatus)
  const genus = scientificName.includes(' ')
    ? scientificName.split(' ')[0] ?? null
    : null

  return {
    scientificName,
    scientificNameAuthorship: null,
    commonNames: [commonName],
    family: null,
    genus,
    score,
    confidencePercent: confidencePercent(score),
    taxonId: null,
    description,
    healthStatus,
  }
}

function parseGeminiPayload(
  payload: GeminiGenerateContentResponse,
): PlantIdentificationOutcome {
  if (payload.error?.message) {
    return failure('API_ERROR', `فشل التعريف: ${payload.error.message}`)
  }

  if (payload.promptFeedback?.blockReason) {
    return failure(
      'API_ERROR',
      `تم حظر الطلب من Gemini (${payload.promptFeedback.blockReason}). جرّب صورة أخرى.`,
    )
  }

  const text = extractGeminiText(payload)
  if (!text) {
    return failure(
      'NO_RESULTS',
      'تعذّر التعرف على النبات من الصورة. جرّب صورة أوضح بإضاءة جيدة.',
    )
  }

  const plant = parseGeminiPlantJson(text)
  if (!plant) {
    console.error('[Gemini] could not parse plant JSON', text.slice(0, 400))
    return failure(
      'API_ERROR',
      'استجابة غير صالحة من Gemini (تعذّر قراءة JSON).',
    )
  }

  const candidate = mapGeminiPlantToCandidate(plant)
  if (
    !candidate.scientificName ||
    candidate.scientificName === FALLBACK_SCIENTIFIC_NAME
  ) {
    if (!candidate.commonNames[0] || candidate.commonNames[0] === FALLBACK_COMMON_NAME) {
      return failure(
        'NO_RESULTS',
        'تعذّر التعرف على النبات من الصورة. جرّب صورة أوضح بإضاءة جيدة.',
      )
    }
  }

  return {
    ok: true,
    bestMatch: candidate.scientificName,
    candidates: [candidate],
    identifiedAt: new Date().toISOString(),
  }
}

function isGeminiResponse(value: unknown): value is GeminiGenerateContentResponse {
  const record = asRecord(value)
  if (!record) return false
  return (
    Array.isArray(record.candidates) ||
    asRecord(record.error) !== null ||
    asRecord(record.promptFeedback) !== null
  )
}

// ─── Internal: Arabic HTTP errors ────────────────────────────────────────────

function failure(
  code: Extract<PlantIdentificationOutcome, { ok: false }>['code'],
  message: string,
): Extract<PlantIdentificationOutcome, { ok: false }> {
  return { ok: false, code, message }
}

function extractApiErrorText(rawBody: string): string {
  const trimmed = rawBody.trim()
  if (!trimmed) return ''
  try {
    const parsed: unknown = JSON.parse(trimmed)
    const record = asRecord(parsed)
    const error = asRecord(record?.error)
    if (error) {
      const message = readOptionalString(error.message)
      if (message) return message.slice(0, 400)
    }
  } catch {
    /* plain text */
  }
  return trimmed.slice(0, 400)
}

async function messageForHttpError(response: Response): Promise<string> {
  let rawBody = ''
  try {
    rawBody = await response.text()
  } catch {
    rawBody = ''
  }

  const detail = extractApiErrorText(rawBody)
  const status = response.status

  if (status === 400) {
    return detail
      ? `طلب غير صالح إلى Gemini (400): ${detail}`
      : 'طلب غير صالح إلى خدمة التعريف (400).'
  }
  if (status === 401 || status === 403) {
    return detail
      ? `مفتاح Gemini مرفوض (${status}): ${detail}`
      : `مفتاح Gemini غير صالح أو غير مصرّح (${status}).`
  }
  if (status === 404) {
    return detail
      ? `نموذج Gemini غير متاح (404): ${detail}`
      : 'نموذج gemini-1.5-flash غير متاح حالياً (404).'
  }
  if (status === 429) {
    return 'تم تجاوز حد طلبات التعريف (429). حاول مرة أخرى لاحقاً.'
  }
  if (status >= 500) {
    return detail
      ? `خدمة التعريف غير متاحة حالياً (${status}): ${detail}`
      : `خدمة التعريف غير متاحة حالياً (HTTP ${status}).`
  }

  const statusLabel = response.statusText
    ? `HTTP ${status} ${response.statusText}`
    : `HTTP ${status}`

  return detail
    ? `فشل طلب التعريف (${statusLabel}): ${detail}`
    : `فشل طلب التعريف (${statusLabel}).`
}

// ─── Public: identify ────────────────────────────────────────────────────────

/**
 * Identify a plant image via Google Gemini (`gemini-1.5-flash`).
 * Sends base64 `inline_data` + structured JSON prompt; maps result to UI candidates.
 */
export async function identifyPlant(
  file: File,
  _options: IdentifyImageOptions = {},
): Promise<PlantIdentificationOutcome> {
  if (!isGeminiApiConfigured()) {
    return failure(
      'MISSING_API_KEY',
      'مفتاح Gemini غير مُعدّ. أضف VITE_GEMINI_API_KEY إلى ملف .env أو إعدادات النشر.',
    )
  }

  try {
    validatePlantImage(file)
  } catch (error) {
    if (error instanceof ServiceError) {
      return failure(
        error.code === 'FILE_TOO_LARGE' ? 'FILE_TOO_LARGE' : 'INVALID_FILE',
        error.message,
      )
    }
    return failure('INVALID_FILE', 'تعذّر التحقق من ملف الصورة.')
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
    console.error('[Gemini] image compression failed', error)
    return failure(
      'INVALID_FILE',
      'تعذّر ضغط الصورة قبل الإرسال. جرّب صورة أصغر أو بصيغة JPEG/PNG.',
    )
  }

  if (uploadFile.size > MAX_UPLOAD_BYTES) {
    return failure(
      'FILE_TOO_LARGE',
      'ما زالت الصورة كبيرة بعد الضغط. جرّب التقاطاً أقرب أو دقة أقل.',
    )
  }

  let base64: string
  try {
    base64 = await fileToBase64(uploadFile)
  } catch (error) {
    console.error('[Gemini] base64 encode failed', error)
    return failure('INVALID_FILE', 'تعذّر تحويل الصورة إلى Base64.')
  }

  const mimeType = resolveMimeType(uploadFile)
  const url = buildGeminiUrl()
  const body = buildGeminiRequestBody(base64, mimeType)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    console.error('[Gemini] network failure', { error })
    return failure(
      'NETWORK',
      'تعذّر الاتصال بخدمة التعريف. تحقق من اتصال الإنترنت ثم أعد المحاولة.',
    )
  }

  if (!response.ok) {
    const message = await messageForHttpError(response)
    console.error('[Gemini] HTTP error', {
      status: response.status,
      statusText: response.statusText,
      message,
    })
    return failure('API_ERROR', message)
  }

  let rawJson: unknown
  try {
    rawJson = await response.json()
  } catch (error) {
    console.error('[Gemini] JSON parse failure', error)
    return failure(
      'API_ERROR',
      'استجابة غير صالحة من خدمة التعريف (تعذّر قراءة JSON).',
    )
  }

  if (!isGeminiResponse(rawJson)) {
    console.error('[Gemini] unexpected JSON shape', rawJson)
    return failure('API_ERROR', 'بنية استجابة غير متوقعة من خدمة التعريف.')
  }

  try {
    const outcome = parseGeminiPayload(rawJson)
    if (outcome.ok) {
      console.info('[Gemini] top match', summarizePrimaryCandidate(outcome))
    }
    return outcome
  } catch (error) {
    console.error('[Gemini] mapping failure', error)
    return failure('UNKNOWN', 'حدث خطأ أثناء معالجة نتائج التعريف.')
  }
}

export async function identifyPlantOrThrow(
  file: File,
  options?: IdentifyImageOptions,
): Promise<Extract<PlantIdentificationOutcome, { ok: true }>> {
  const outcome = await identifyPlant(file, options)
  if (!outcome.ok) {
    throw new ServiceError(outcome.message, outcome.code)
  }
  return outcome
}
