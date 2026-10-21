import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerativeModel,
  type ResponseSchema,
} from '@google/generative-ai'
import type {
  IdentifyImageOptions,
  PlantIdentificationCandidate,
  PlantIdentificationOutcome,
  PlantIdentificationPrimarySummary,
} from '@/types/identification'
import { ServiceError } from '@/services/errors'
import { compressImageForUpload } from '@/services/imageUtils'
import { extractBinomialScientificName } from '@/lib/scientificName'

// ─── Constants ───────────────────────────────────────────────────────────────

/** Primary model for real vision analysis — no mock data path. */
const GEMINI_MODEL = 'gemini-1.5-flash'

const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 1200

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_SOURCE_BYTES = 25 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

const ARABIC_SCRIPT = /[\u0600-\u06FF]/

const NON_PLANT_MESSAGE =
  'الصورة المرفوعة ليست نباتاً. يرجى رفع صورة نبات أو ورقة شجر واضحة.'

const SYSTEM_INSTRUCTION = `You are a botanical vision expert.
Analyze the provided image carefully.
First decide whether the image shows a plant, flower, tree, or plant leaf.
Respond with valid JSON only — no markdown, no code fences, no extra text.
All plant care text values must be in Arabic. scientificName must be Latin.`

const USER_PROMPT = `Analyze the provided image. First, determine if it contains a plant, flower, tree, or plant leaf.

- IF IT IS NOT A PLANT (e.g. a watch, car, animal, human): Return JSON exactly like:
{"isPlant": false, "message": "الصورة المرفوعة ليست نباتاً. يرجى رفع صورة نبات أو ورقة شجر واضحة."}

- IF IT IS A PLANT: Return JSON exactly like:
{"isPlant": true, "name": "اسم النبات", "scientificName": "الاسم العلمي", "confidence": 90, "watering": "تفاصيل الري الخاصة بهذا النبات بعينه", "light": "متطلبات الإضاءة الخاصة به", "temperature": "درجة الحرارة المناسبة", "description": "وصف دقيق وخاص بسبل العناية بهذا النبات"}

confidence is an integer from 0 to 100.
Never invent a plant when the image is not a plant.`

const PLANT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isPlant: { type: SchemaType.BOOLEAN },
    message: { type: SchemaType.STRING },
    name: { type: SchemaType.STRING },
    scientificName: { type: SchemaType.STRING },
    confidence: { type: SchemaType.NUMBER },
    watering: { type: SchemaType.STRING },
    light: { type: SchemaType.STRING },
    temperature: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
  },
  required: ['isPlant'],
}

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
  const named = candidate?.name?.trim() || candidate?.commonNames?.[0]?.trim()
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
    isPlant: outcome.isPlant,
    message: outcome.message,
  }
}

// ─── Image helpers ───────────────────────────────────────────────────────────

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

// ─── JSON parsing (no hardcoded plant content) ───────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function coerceToText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => coerceToText(item))
      .filter((item): item is string => Boolean(item))
    return parts.length > 0 ? parts.join('، ') : null
  }
  return null
}

function coerceConfidence(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 1) return Math.round(value * 100)
    return Math.round(Math.min(Math.max(value, 0), 100))
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d{1,3})/)
    if (match?.[1]) {
      const pct = Number.parseInt(match[1], 10)
      if (Number.isFinite(pct)) return Math.min(Math.max(pct, 0), 100)
    }
  }
  return 70
}

function normalizeKey(key: string): string {
  return key
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./\\]+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function buildNormalizedMap(
  record: Record<string, unknown>,
): Map<string, unknown> {
  const map = new Map<string, unknown>()
  for (const [key, value] of Object.entries(record)) {
    map.set(normalizeKey(key), value)
  }
  return map
}

function lookup(
  map: Map<string, unknown>,
  aliases: string[],
): unknown {
  for (const alias of aliases) {
    if (map.has(normalizeKey(alias))) return map.get(normalizeKey(alias))
  }
  return undefined
}

/** Strip markdown fences and isolate the first JSON object. */
export function extractJsonPayload(raw: string): string {
  let text = raw.trim()
  text = text.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '')
  text = text.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'")

  const fenced = text.match(/```(?:json|javascript|js)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    text = fenced[1].trim()
  } else if (text.startsWith('```')) {
    text = text
      .replace(/^```(?:json|javascript|js)?\s*/i, '')
      .replace(/\s*```$/i, '')
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) return text.slice(start, end + 1)
  return text
}

function softRepairJson(text: string): string {
  return text
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
    .replace(/(:\s*)'([^']*)'/g, '$1"$2"')
}

function tryParseJson(raw: string): unknown | null {
  const cleaned = extractJsonPayload(raw)
  for (const attempt of [cleaned, softRepairJson(cleaned)]) {
    try {
      return JSON.parse(attempt)
    } catch {
      // continue
    }
  }
  return null
}

function readIsPlant(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase()
    if (['true', 'yes', '1', 'plant', 'نبات'].includes(lower)) return true
    if (['false', 'no', '0', 'notplant', 'غيرنبات'].includes(lower)) return false
  }
  if (typeof value === 'number') return value !== 0
  return null
}

function mapCandidateFromRecord(
  map: Map<string, unknown>,
): PlantIdentificationCandidate | null {
  const name =
    coerceToText(lookup(map, ['name', 'common_name', 'commonName', 'arabic_name', 'الاسم'])) ||
    null
  const rawScientific =
    coerceToText(
      lookup(map, [
        'scientificName',
        'scientific_name',
        'latinName',
        'الاسمالعلمي',
      ]),
    ) || null

  if (!name && !rawScientific) return null

  const displayName = name || rawScientific || ''
  const scientificName = rawScientific
    ? extractBinomialScientificName(rawScientific) || rawScientific
    : displayName

  const confidence = coerceConfidence(
    lookup(map, ['confidence', 'score', 'certainty', 'الثقة']),
  )
  const watering = coerceToText(
    lookup(map, ['watering', 'water', 'الري']),
  )
  const light = coerceToText(
    lookup(map, ['light', 'sunlight', 'الإضاءة', 'الاضاءة']),
  )
  const temperature = coerceToText(
    lookup(map, ['temperature', 'temp', 'الحرارة']),
  )
  const description = coerceToText(
    lookup(map, ['description', 'desc', 'الوصف']),
  )

  const genus =
    scientificName && /^[A-Za-z]/.test(scientificName)
      ? scientificName.split(/\s+/)[0] ?? null
      : null

  return {
    name: displayName,
    scientificName,
    scientificNameAuthorship: null,
    commonNames: [displayName],
    family: null,
    genus,
    score: confidence / 100,
    confidencePercent: confidence,
    taxonId: null,
    description,
    watering,
    light,
    temperature,
    soil: null,
    environment: null,
    careGuide: null,
    healthStatus: `${confidence}%`,
  }
}

/**
 * Parse Gemini JSON into a success outcome.
 * Returns null only when the payload is unusable — never invents plant data.
 */
export function outcomeFromGeminiText(
  rawText: string,
): Extract<PlantIdentificationOutcome, { ok: true }> | null {
  const trimmed = rawText.trim()
  if (!trimmed) return null

  console.log('[Gemini] RAW response text:', trimmed)

  const parsed = tryParseJson(trimmed)
  console.log('[Gemini] PARSED JSON:', parsed)

  if (parsed === null) {
    console.error('Plant Identification Error:', new Error('JSON parse failed'))
    return null
  }

  const record = asRecord(parsed)
  if (!record) {
    console.error('Plant Identification Error:', new Error('Parsed value is not an object'))
    return null
  }

  const map = buildNormalizedMap(record)
  const isPlantFlag = readIsPlant(
    lookup(map, ['isPlant', 'is_plant', 'plant', 'containsPlant']),
  )

  // Explicit non-plant
  if (isPlantFlag === false) {
    const message =
      coerceToText(lookup(map, ['message', 'error', 'reason', 'الرسالة'])) ||
      NON_PLANT_MESSAGE

    const outcome: Extract<PlantIdentificationOutcome, { ok: true }> = {
      ok: true,
      isPlant: false,
      message,
      bestMatch: null,
      candidates: [],
      identifiedAt: new Date().toISOString(),
    }
    console.log('[Gemini] NON-PLANT outcome:', outcome)
    return outcome
  }

  // Explicit plant OR missing flag but plant fields present
  const candidate = mapCandidateFromRecord(map)
  if (!candidate) {
    // No plant fields and no clear plant flag → treat as non-plant when model said nothing useful
    if (isPlantFlag === null) {
      const maybeMessage = coerceToText(
        lookup(map, ['message', 'error', 'reason']),
      )
      if (maybeMessage) {
        return {
          ok: true,
          isPlant: false,
          message: maybeMessage,
          bestMatch: null,
          candidates: [],
          identifiedAt: new Date().toISOString(),
        }
      }
    }
    console.error(
      'Plant Identification Error:',
      new Error('Plant JSON missing name/scientificName'),
    )
    return null
  }

  // If model forgot isPlant but returned plant fields, accept as plant
  const outcome: Extract<PlantIdentificationOutcome, { ok: true }> = {
    ok: true,
    isPlant: true,
    message: null,
    bestMatch: candidate.scientificName || candidate.name,
    candidates: [candidate],
    identifiedAt: new Date().toISOString(),
  }

  console.log('[Gemini] PLANT outcome / mapped candidate:', {
    summary: summarizePrimaryCandidate(outcome),
    candidate,
  })

  return outcome
}

function failure(
  code: Extract<PlantIdentificationOutcome, { ok: false }>['code'],
  message: string,
): Extract<PlantIdentificationOutcome, { ok: false }> {
  return { ok: false, code, message }
}

// ─── Gemini SDK call ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function createModel(apiKey: string, withSchema: boolean): GenerativeModel {
  const client = new GoogleGenerativeAI(apiKey)
  return client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      ...(withSchema ? { responseSchema: PLANT_RESPONSE_SCHEMA } : {}),
    },
  })
}

async function generateOnce(
  model: GenerativeModel,
  base64Image: string,
  mimeType: string,
): Promise<string> {
  const pureBase64 = cleanBase64(base64Image)
  if (!pureBase64) {
    throw new Error('Empty base64 image payload')
  }

  console.log('[Gemini] sending inlineData', {
    model: GEMINI_MODEL,
    mimeType,
    base64Length: pureBase64.length,
  })

  const result = await model.generateContent([
    { text: USER_PROMPT },
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: pureBase64,
      },
    },
  ])

  return result.response.text()
}

async function callGeminiWithImage(
  apiKey: string,
  base64Image: string,
  mimeType: string,
): Promise<string> {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const withSchema = attempt === 1
    try {
      const model = createModel(apiKey, withSchema)
      const text = await generateOnce(model, base64Image, mimeType)
      if (text.trim()) return text
      lastError = new Error('Empty Gemini response text')
    } catch (error) {
      lastError = error
      console.error('Plant Identification Error:', error)
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS * attempt)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? 'Gemini request failed'))
}

// ─── Public identify ─────────────────────────────────────────────────────────

/**
 * Identify a plant from a real user image via Gemini 1.5 Flash.
 * Never returns hardcoded mock plant care data.
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
    console.error('Plant Identification Error:', error)
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
    console.error('Plant Identification Error:', error)
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
    console.error('Plant Identification Error:', error)
    return failure('INVALID_FILE', 'تعذّر قراءة الصورة.')
  }

  const apiKey = getGeminiApiKey()
  const mimeType = resolveMimeType(uploadFile)

  try {
    const rawText = await callGeminiWithImage(apiKey, base64, mimeType)
    const outcome = outcomeFromGeminiText(rawText)
    if (outcome) return outcome

    return failure(
      'NO_RESULTS',
      'تعذّر فهم نتيجة التعريف. أعد المحاولة بصورة أوضح.',
    )
  } catch (error) {
    console.error('Plant Identification Error:', error)
    return failure(
      'API_ERROR',
      'تعذّر الاتصال بخدمة التعريف. تحقق من الاتصال وأعد المحاولة.',
    )
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
