import { ApiError, GoogleGenAI } from '@google/genai'
import type {
  GeminiPlantJson,
  IdentifyImageOptions,
  PlantIdentificationCandidate,
  PlantIdentificationOutcome,
  PlantIdentificationPrimarySummary,
} from '@/types/identification'
import { ServiceError } from '@/services/errors'
import { compressImageForUpload } from '@/services/imageUtils'
import { extractBinomialScientificName } from '@/lib/scientificName'

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Standard Flash models via the official `@google/genai` SDK.
 *
 * `gemini-1.5-flash` / `gemini-1.5-pro` were shut down and return 404 on v1beta —
 * do not use them. `gemini-2.5-flash` is the current fast Flash replacement.
 * @see https://ai.google.dev/gemini-api/docs/models
 */
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
] as const

/** Initial attempt + 2 retries on HTTP 503 (high demand). */
const MAX_503_RETRIES = 2
const RETRY_BASE_DELAY_MS = 800

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

/**
 * Loads the Gemini key exclusively from Vite env (never hardcoded).
 * Set `VITE_GEMINI_API_KEY` in `.env` or GitHub Actions secrets.
 */
function getGeminiApiKey(): string {
  const raw = import.meta.env.VITE_GEMINI_API_KEY
  if (typeof raw !== 'string') return ''
  const key = raw.trim()
  if (
    !key ||
    key === 'undefined' ||
    key === 'null' ||
    key.toLowerCase().startsWith('your-')
  ) {
    return ''
  }
  return key
}

function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getGeminiApiKey() })
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

// ─── Internal: image helpers ─────────────────────────────────────────────────

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

function cleanBase64(base64Image: string): string {
  return base64Image
    .replace(/^data:[^;]+;base64,/i, '')
    .replace(/\s+/g, '')
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

function outcomeFromGeminiText(text: string): PlantIdentificationOutcome {
  const trimmed = text.trim()
  if (!trimmed) {
    return failure(
      'NO_RESULTS',
      'تعذّر التعرف على النبات من الصورة. جرّب صورة أوضح بإضاءة جيدة.',
    )
  }

  const plant = parseGeminiPlantJson(trimmed)
  if (!plant) {
    console.error('[Gemini] could not parse plant JSON', trimmed.slice(0, 400))
    return failure(
      'API_ERROR',
      'استجابة غير صالحة من Gemini (تعذّر قراءة JSON).',
    )
  }

  const candidate = mapGeminiPlantToCandidate(plant)
  if (
    (!candidate.scientificName ||
      candidate.scientificName === FALLBACK_SCIENTIFIC_NAME) &&
    (!candidate.commonNames[0] ||
      candidate.commonNames[0] === FALLBACK_COMMON_NAME)
  ) {
    return failure(
      'NO_RESULTS',
      'تعذّر التعرف على النبات من الصورة. جرّب صورة أوضح بإضاءة جيدة.',
    )
  }

  return {
    ok: true,
    bestMatch: candidate.scientificName,
    candidates: [candidate],
    identifiedAt: new Date().toISOString(),
  }
}

// ─── Internal: SDK calls + retries ───────────────────────────────────────────

function failure(
  code: Extract<PlantIdentificationOutcome, { ok: false }>['code'],
  message: string,
): Extract<PlantIdentificationOutcome, { ok: false }> {
  return { ok: false, code, message }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getErrorStatus(error: unknown): number | null {
  if (error instanceof ApiError && typeof error.status === 'number') {
    return error.status
  }
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: unknown }).status
    return typeof status === 'number' ? status : null
  }
  return null
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim().slice(0, 400)
  }
  return ''
}

function messageFromStatus(status: number, detail: string): string {
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
      : 'نموذج Gemini غير متاح حالياً (404).'
  }
  if (status === 429) {
    return 'تم تجاوز حد طلبات التعريف (429). حاول مرة أخرى لاحقاً.'
  }
  if (status === 503) {
    return [
      'خدمة Gemini مشغولة حالياً بسبب ارتفاع الطلب (503).',
      'أعد المحاولة بعد لحظات.',
      detail ? `التفاصيل: ${detail}` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (status >= 500) {
    return detail
      ? `خدمة التعريف غير متاحة حالياً (${status}): ${detail}`
      : `خدمة التعريف غير متاحة حالياً (HTTP ${status}).`
  }
  return detail
    ? `فشل طلب التعريف (HTTP ${status}): ${detail}`
    : `فشل طلب التعريف (HTTP ${status}).`
}

type SdkCallResult =
  | { kind: 'ok'; text: string }
  | { kind: 'http'; status: number; message: string }
  | { kind: 'network'; message: string }

async function generateOnce(
  client: GoogleGenAI,
  model: string,
  base64Image: string,
  mimeType: string,
): Promise<SdkCallResult> {
  try {
    const response = await client.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: GEMINI_IDENTIFY_PROMPT },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64(base64Image),
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    })

    const text = typeof response.text === 'string' ? response.text : ''
    return { kind: 'ok', text }
  } catch (error) {
    const status = getErrorStatus(error)
    const detail = getErrorMessage(error)

    if (status == null) {
      return {
        kind: 'network',
        message: detail || 'تعذّر الاتصال بخدمة التعريف.',
      }
    }

    return {
      kind: 'http',
      status,
      message: messageFromStatus(status, detail),
    }
  }
}

async function generateWith503Retries(
  client: GoogleGenAI,
  model: string,
  base64Image: string,
  mimeType: string,
): Promise<SdkCallResult> {
  let lastResult: SdkCallResult | null = null

  for (let attempt = 0; attempt <= MAX_503_RETRIES; attempt += 1) {
    if (attempt > 0) {
      const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
      console.warn('[Gemini] 503 high demand — retrying', {
        model,
        attempt,
        delayMs,
      })
      await sleep(delayMs)
    }

    const result = await generateOnce(client, model, base64Image, mimeType)
    lastResult = result

    if (result.kind === 'ok' || result.kind === 'network') {
      return result
    }
    if (result.status !== 503) {
      return result
    }
  }

  return (
    lastResult ?? {
      kind: 'network',
      message: 'تعذّر الاتصال بخدمة التعريف.',
    }
  )
}

// ─── Public: identify ────────────────────────────────────────────────────────

/**
 * Identify a plant image via the official `@google/genai` SDK
 * (`models.generateContent` + base64 `inlineData`).
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
  const client = createGeminiClient()

  let lastHttpError: PlantIdentificationOutcome | null = null
  let saw503 = false

  for (const model of GEMINI_MODELS) {
    const result = await generateWith503Retries(
      client,
      model,
      base64,
      mimeType,
    )

    if (result.kind === 'network') {
      console.error('[Gemini] network failure', { model, message: result.message })
      return failure(
        'NETWORK',
        'تعذّر الاتصال بخدمة التعريف. تحقق من اتصال الإنترنت ثم أعد المحاولة.',
      )
    }

    if (result.kind === 'http') {
      if (result.status === 503) {
        saw503 = true
        console.warn('[Gemini] 503 after retries — trying next model', {
          model,
          message: result.message,
        })
        lastHttpError = failure('API_ERROR', result.message)
        continue
      }

      if (result.status === 404) {
        console.warn('[Gemini] model not found, trying next', {
          model,
          message: result.message,
        })
        lastHttpError = failure('API_ERROR', result.message)
        continue
      }

      console.error('[Gemini] HTTP error', {
        model,
        status: result.status,
        message: result.message,
      })
      return failure('API_ERROR', result.message)
    }

    try {
      const outcome = outcomeFromGeminiText(result.text)
      if (outcome.ok) {
        console.info('[Gemini] top match', {
          model,
          summary: summarizePrimaryCandidate(outcome),
        })
      }
      return outcome
    } catch (error) {
      console.error('[Gemini] mapping failure', { model, error })
      return failure('UNKNOWN', 'حدث خطأ أثناء معالجة نتائج التعريف.')
    }
  }

  if (saw503) {
    return failure(
      'API_ERROR',
      'خدمة Gemini مشغولة بسبب ارتفاع الطلب (503). انتظر دقيقة ثم أعد المحاولة.',
    )
  }

  return (
    lastHttpError ??
    failure(
      'API_ERROR',
      'لم يُعثر على نموذج Gemini مدعوم. تحقّق من المفتاح أو أعد المحاولة لاحقاً.',
    )
  )
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
