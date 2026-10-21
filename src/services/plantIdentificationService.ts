import {
  GoogleGenerativeAI,
  type GenerativeModel,
} from '@google/generative-ai'
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
 * Model waterfall (official `@google/generative-ai` SDK):
 * 1) gemini-2.0-flash  2) gemini-1.5-flash on overload / failure
 * Failures are silent to the UI — never surface raw 503 codes.
 */
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'] as const

/** Extra attempts per model (silent) before moving to the next model. */
const MAX_ATTEMPTS_PER_MODEL = 2
const RETRY_DELAY_MS = 1000

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

export function isGeminiApiConfigured(): boolean {
  return getGeminiApiKey().length > 0
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

// ─── Internal: JSON parsing (markdown-safe) ──────────────────────────────────

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

/** Strip ```json fences and isolate the first JSON object. */
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

function outcomeFromGeminiText(text: string): PlantIdentificationOutcome | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const plant = parseGeminiPlantJson(trimmed)
  if (!plant) return null

  const candidate = mapGeminiPlantToCandidate(plant)
  const hasName =
    (candidate.scientificName &&
      candidate.scientificName !== FALLBACK_SCIENTIFIC_NAME) ||
    (candidate.commonNames[0] &&
      candidate.commonNames[0] !== FALLBACK_COMMON_NAME)

  if (!hasName) return null

  return {
    ok: true,
    bestMatch: candidate.scientificName,
    candidates: [candidate],
    identifiedAt: new Date().toISOString(),
  }
}

/**
 * Soft success payload so the UI never hangs or shows raw 503 / API codes.
 * Completes the analyze flow with a clear Arabic explanation.
 */
function buildGracefulFallbackSuccess(): Extract<
  PlantIdentificationOutcome,
  { ok: true }
> {
  const candidate: PlantIdentificationCandidate = {
    scientificName: FALLBACK_SCIENTIFIC_NAME,
    scientificNameAuthorship: null,
    commonNames: [FALLBACK_COMMON_NAME],
    family: null,
    genus: null,
    score: 0.35,
    confidencePercent: 35,
    taxonId: null,
    description:
      'تعذّر إكمال التعريف الآن. يُرجى إعادة المحاولة بعد قليل بصورة أوضح وإضاءة جيدة.',
    healthStatus: 'إعادة المحاولة مُستحسنة',
  }

  console.warn(
    '[Gemini] all models/retries exhausted — returning graceful UI fallback',
  )

  return {
    ok: true,
    bestMatch: candidate.scientificName,
    candidates: [candidate],
    identifiedAt: new Date().toISOString(),
  }
}

function failure(
  code: Extract<PlantIdentificationOutcome, { ok: false }>['code'],
  message: string,
): Extract<PlantIdentificationOutcome, { ok: false }> {
  return { ok: false, code, message }
}

// ─── Internal: SDK waterfall + silent retries ────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isOverloadedError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error ?? '').toLowerCase()

  return (
    message.includes('503') ||
    message.includes('overloaded') ||
    message.includes('high demand') ||
    message.includes('unavailable') ||
    message.includes('resource_exhausted') ||
    message.includes('too many requests') ||
    message.includes('429')
  )
}

function createModel(apiKey: string, modelName: string): GenerativeModel {
  const client = new GoogleGenerativeAI(apiKey)
  return client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  })
}

async function generateOnce(
  model: GenerativeModel,
  base64Image: string,
  mimeType: string,
): Promise<string> {
  const result = await model.generateContent([
    { text: GEMINI_IDENTIFY_PROMPT },
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64(base64Image),
      },
    },
  ])

  return result.response.text()
}

/**
 * Silent retry wrapper: up to MAX_ATTEMPTS_PER_MODEL with fixed backoff.
 * Never throws to the UI — returns null when the model cannot produce text.
 */
async function generateWithRetries(
  modelName: string,
  apiKey: string,
  base64Image: string,
  mimeType: string,
): Promise<string | null> {
  const model = createModel(apiKey, modelName)

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
    try {
      const text = await generateOnce(model, base64Image, mimeType)
      if (text.trim()) return text
      console.warn('[Gemini] empty response', { modelName, attempt })
    } catch (error) {
      console.warn('[Gemini] attempt failed (suppressed)', {
        modelName,
        attempt,
        overloaded: isOverloadedError(error),
        message: error instanceof Error ? error.message : String(error),
      })
    }

    if (attempt < MAX_ATTEMPTS_PER_MODEL) {
      await sleep(RETRY_DELAY_MS * attempt) // 1s, then 2s
    }
  }

  return null
}

/**
 * Try each model in the waterfall. Returns parsed success or null.
 */
async function identifyWithModelWaterfall(
  apiKey: string,
  base64Image: string,
  mimeType: string,
): Promise<Extract<PlantIdentificationOutcome, { ok: true }> | null> {
  for (const modelName of GEMINI_MODELS) {
    const text = await generateWithRetries(
      modelName,
      apiKey,
      base64Image,
      mimeType,
    )
    if (!text) {
      console.warn('[Gemini] moving to next model', { modelName })
      continue
    }

    const outcome = outcomeFromGeminiText(text)
    if (outcome?.ok) {
      console.info('[Gemini] top match', {
        modelName,
        summary: summarizePrimaryCandidate(outcome),
      })
      return outcome
    }

    console.warn('[Gemini] unusable JSON — trying next model', { modelName })
  }

  return null
}

// ─── Public: identify ────────────────────────────────────────────────────────

/**
 * Identify a plant via `@google/generative-ai` with a silent model waterfall.
 * Users never see 503 / busy errors — failures become a soft success fallback.
 */
export async function identifyPlant(
  file: File,
  _options: IdentifyImageOptions = {},
): Promise<PlantIdentificationOutcome> {
  if (!isGeminiApiConfigured()) {
    return failure(
      'MISSING_API_KEY',
      'مفتاح التعريف غير مُعدّ. أضف VITE_GEMINI_API_KEY إلى ملف .env ثم أعد التشغيل.',
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
      'تعذّر تجهيز الصورة. جرّب صورة أصغر أو بصيغة JPEG/PNG.',
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
    return failure('INVALID_FILE', 'تعذّر قراءة الصورة.')
  }

  const apiKey = getGeminiApiKey()
  const mimeType = resolveMimeType(uploadFile)

  try {
    const success = await identifyWithModelWaterfall(
      apiKey,
      base64,
      mimeType,
    )
    if (success) return success
  } catch (error) {
    // Absolute last resort — never leak API status codes to the UI
    console.error('[Gemini] unexpected identify failure (suppressed)', error)
  }

  return buildGracefulFallbackSuccess()
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
