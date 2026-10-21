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

const GEMINI_IDENTIFY_PROMPT = `أنت خبير نباتات. حلّل صورة النبات أو الزهرة التالية بدقة.

أعد كائن JSON صالحاً فقط — بدون Markdown وبدون \`\`\`json وبدون أي نص خارج JSON.
يجب أن يحتوي الكائن على هذه المفاتيح بالضبط وبقيم عربية واضحة (ما عدا الاسم العلمي):

{
  "name": "الاسم الشائع بالعربية",
  "scientificName": "الاسم العلمي اللاتيني (Genus species) بدون المؤلف",
  "watering": "إرشادات الري بالعربية باختصار",
  "light": "احتياجات الإضاءة بالعربية باختصار",
  "temperature": "درجة الحرارة المناسبة بالعربية باختصار",
  "description": "وصف قصير للنبات وطريقة العناية به بالعربية"
}

لا تترك الحقول فارغة. إن لم تكن متأكداً تماماً، أعطِ أفضل تخمين واقعي مع قيم عناية عامة مناسبة.`

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
    watering: primary?.watering ?? null,
    light: primary?.light ?? null,
    temperature: primary?.temperature ?? null,
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

// ─── Internal: JSON parsing (markdown-safe, schema-tolerant) ─────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

/** Coerce Gemini values (string | number | array | shallow object) to text. */
function coerceToText(value: unknown): string | null {
  if (value === null || value === undefined) return null

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

  const record = asRecord(value)
  if (record) {
    // Prefer known text-ish nested keys inside care objects
    for (const key of [
      'text',
      'value',
      'label',
      'ar',
      'arabic',
      'description',
      'info',
      'detail',
      'details',
      'instruction',
      'note',
    ]) {
      const nested = coerceToText(record[key])
      if (nested) return nested
    }

    const parts = Object.values(record)
      .map((item) => coerceToText(item))
      .filter((item): item is string => Boolean(item))
    return parts.length > 0 ? parts.join(' — ') : null
  }

  return null
}

function readOptionalString(value: unknown): string | null {
  return coerceToText(value)
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

/** Normalize object keys for case / punctuation / Arabic-insensitive lookup. */
function normalizeKey(key: string): string {
  return key
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./\\]+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

const FIELD_ALIASES = {
  name: [
    'name',
    'commonname',
    'common_name',
    'arabicname',
    'arabic_name',
    'plantname',
    'plant_name',
    'displayname',
    'title',
    'الاسم',
    'اسم',
    'الاسمالشائع',
    'اسمالنبات',
  ],
  scientificName: [
    'scientificname',
    'scientific_name',
    'latinname',
    'latin_name',
    'binomial',
    'species',
    'taxonomy',
    'الاسمالعلمي',
    'الاسماللاتيني',
  ],
  watering: [
    'watering',
    'water',
    'waterneeds',
    'irrigation',
    'الري',
    'احتياجاتالري',
    'ماء',
  ],
  light: [
    'light',
    'sunlight',
    'lighting',
    'sun',
    'lightneeds',
    'الإضاءة',
    'الاضاءة',
    'الشمس',
    'ضوء',
  ],
  temperature: [
    'temperature',
    'temp',
    'temperaturerange',
    'temperature_range',
    'heat',
    'الحرارة',
    'درجةالحرارة',
  ],
  description: [
    'description',
    'desc',
    'summary',
    'about',
    'overview',
    'details',
    'care',
    'careguide',
    'care_guide',
    'الوصف',
    'وصف',
    'العناية',
  ],
  healthStatus: [
    'healthstatus',
    'health_status',
    'confidence',
    'certainty',
    'score',
    'الثقة',
    'الحالة',
  ],
} as const

type PlantField = keyof typeof FIELD_ALIASES

function buildNormalizedMap(
  record: Record<string, unknown>,
): Map<string, unknown> {
  const map = new Map<string, unknown>()
  for (const [key, value] of Object.entries(record)) {
    const normalized = normalizeKey(key)
    if (!normalized) continue
    // Prefer first non-empty text-ish value if duplicates exist
    if (!map.has(normalized) || coerceToText(map.get(normalized)) === null) {
      map.set(normalized, value)
    }
  }
  return map
}

function lookupField(
  map: Map<string, unknown>,
  field: PlantField,
): string | null {
  for (const alias of FIELD_ALIASES[field]) {
    const value = coerceToText(map.get(normalizeKey(alias)))
    if (value) return value
  }
  return null
}

/** Containers Gemini often wraps the plant object in. */
const WRAPPER_KEYS = new Set(
  [
    'plant',
    'data',
    'result',
    'results',
    'response',
    'payload',
    'identification',
    'identifiedplant',
    'identified_plant',
    'species',
    'info',
    'details',
    'output',
    'analysis',
    'prediction',
  ].map(normalizeKey),
)

const CARE_WRAPPER_KEYS = new Set(
  [
    'care',
    'careinfo',
    'care_info',
    'careguide',
    'care_guide',
    'careinstructions',
    'needs',
    'requirements',
    'العناية',
  ].map(normalizeKey),
)

function unwrapPlantRecord(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 4) return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = unwrapPlantRecord(item, depth + 1)
      if (found) return found
    }
    return null
  }

  const record = asRecord(value)
  if (!record) return null

  const map = buildNormalizedMap(record)
  const hasDirectName =
    lookupField(map, 'name') || lookupField(map, 'scientificName')
  if (hasDirectName) return record

  for (const [key, nested] of Object.entries(record)) {
    if (!WRAPPER_KEYS.has(normalizeKey(key))) continue
    const found = unwrapPlantRecord(nested, depth + 1)
    if (found) return found
  }

  return record
}

/** Strip ``` / ```json fences and isolate the first JSON object/array. */
function cleanJsonText(raw: string): string {
  let text = raw.trim()
  text = text.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '')

  // Smart quotes → standard quotes
  text = text.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'")

  const fenced = text.match(/```(?:json|javascript|js)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    text = fenced[1].trim()
  } else if (text.startsWith('```')) {
    text = text.replace(/^```(?:json|javascript|js)?\s*/i, '').replace(/\s*```$/i, '')
  }

  const objStart = text.indexOf('{')
  const arrStart = text.indexOf('[')
  const start =
    objStart === -1
      ? arrStart
      : arrStart === -1
        ? objStart
        : Math.min(objStart, arrStart)

  if (start === -1) return text

  const opener = text[start]
  const closer = opener === '[' ? ']' : '}'
  const end = text.lastIndexOf(closer)
  if (end > start) {
    return text.slice(start, end + 1)
  }
  return text.slice(start)
}

/** Soft-repair common Gemini JSON issues (trailing commas, JS-style quotes). */
function softRepairJson(text: string): string {
  return (
    text
      // trailing commas before } or ]
      .replace(/,\s*([}\]])/g, '$1')
      // single-quoted keys → double-quoted
      .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
      // single-quoted string values → double-quoted
      .replace(/(:\s*)'([^']*)'/g, '$1"$2"')
  )
}

function tryParseJson(raw: string): unknown | null {
  const cleaned = cleanJsonText(raw)
  const attempts = [cleaned, softRepairJson(cleaned)]

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt)
    } catch {
      // continue
    }
  }
  return null
}

/**
 * Last-resort: pull quoted key/value pairs with a regex when JSON.parse fails.
 * Handles markdown wrappers and slightly broken JSON.
 */
function extractFieldsViaRegex(raw: string): GeminiPlantJson | null {
  const text = cleanJsonText(raw)
  const found: Record<string, string> = {}

  const pairRe =
    /["']([^"']+)["']\s*:\s*(?:["']([^"']*)["']|([^,}\]\n]+))/g

  let match: RegExpExecArray | null
  while ((match = pairRe.exec(text)) !== null) {
    const key = normalizeKey(match[1] ?? '')
    const value = (match[2] ?? match[3] ?? '').trim().replace(/^["']|["']$/g, '')
    if (!key || !value || value === 'null' || value === 'undefined') continue
    if (!found[key]) found[key] = value
  }

  if (Object.keys(found).length === 0) return null

  const map = new Map<string, unknown>(Object.entries(found))
  const plant: GeminiPlantJson = {
    name: lookupField(map, 'name') ?? undefined,
    scientificName: lookupField(map, 'scientificName') ?? undefined,
    watering: lookupField(map, 'watering') ?? undefined,
    light: lookupField(map, 'light') ?? undefined,
    temperature: lookupField(map, 'temperature') ?? undefined,
    description: lookupField(map, 'description') ?? undefined,
    health_status: lookupField(map, 'healthStatus') ?? undefined,
  }

  if (
    !plant.name &&
    !plant.scientificName &&
    !plant.watering &&
    !plant.light &&
    !plant.temperature &&
    !plant.description
  ) {
    return null
  }

  return plant
}

function mergeCareWrapper(
  plantRecord: Record<string, unknown>,
): Map<string, unknown> {
  const map = buildNormalizedMap(plantRecord)

  for (const [key, value] of Object.entries(plantRecord)) {
    if (!CARE_WRAPPER_KEYS.has(normalizeKey(key))) continue
    const careRecord = asRecord(value)
    if (!careRecord) {
      // Sometimes "care" is a single description string
      const careText = coerceToText(value)
      if (careText && !map.has(normalizeKey('description'))) {
        map.set(normalizeKey('description'), careText)
      }
      continue
    }
    for (const [careKey, careValue] of Object.entries(careRecord)) {
      const normalized = normalizeKey(careKey)
      if (!map.has(normalized) || coerceToText(map.get(normalized)) === null) {
        map.set(normalized, careValue)
      }
    }
  }

  return map
}

function parseGeminiPlantJson(rawText: string): GeminiPlantJson | null {
  const parsed = tryParseJson(rawText)

  if (parsed !== null) {
    const plantRecord = unwrapPlantRecord(parsed)
    if (plantRecord) {
      const map = mergeCareWrapper(plantRecord)
      const plant: GeminiPlantJson = {
        name: lookupField(map, 'name') ?? undefined,
        scientificName: lookupField(map, 'scientificName') ?? undefined,
        watering: lookupField(map, 'watering') ?? undefined,
        light: lookupField(map, 'light') ?? undefined,
        temperature: lookupField(map, 'temperature') ?? undefined,
        description: lookupField(map, 'description') ?? undefined,
        health_status: lookupField(map, 'healthStatus') ?? undefined,
        common_name: lookupField(map, 'name') ?? undefined,
        scientific_name: lookupField(map, 'scientificName') ?? undefined,
      }

      if (
        plant.name ||
        plant.scientificName ||
        plant.watering ||
        plant.light ||
        plant.temperature ||
        plant.description
      ) {
        return plant
      }
    }
  }

  const regexFallback = extractFieldsViaRegex(rawText)
  if (regexFallback) {
    console.warn('[Gemini] used regex fallback parser', {
      preview: rawText.slice(0, 300),
    })
    return regexFallback
  }

  console.warn('[Gemini] JSON parse failed', {
    preview: rawText.slice(0, 400),
  })
  return null
}

function mapGeminiPlantToCandidate(
  plant: GeminiPlantJson,
): PlantIdentificationCandidate {
  const commonName =
    readOptionalString(plant.name) ||
    readOptionalString(plant.common_name) ||
    FALLBACK_COMMON_NAME

  const rawScientific =
    readOptionalString(plant.scientificName) ||
    readOptionalString(plant.scientific_name) ||
    ''

  // Keep Latin binomial when possible; never wipe a usable scientific string
  const binomial = rawScientific
    ? extractBinomialScientificName(rawScientific)
    : ''
  const scientificName =
    binomial || rawScientific || (commonName !== FALLBACK_COMMON_NAME ? commonName : FALLBACK_SCIENTIFIC_NAME)

  const description = readOptionalString(plant.description)
  const watering = readOptionalString(plant.watering)
  const light = readOptionalString(plant.light)
  const temperature = readOptionalString(plant.temperature)
  const healthStatus = readOptionalString(plant.health_status)
  const score = parseConfidenceFromHealthStatus(healthStatus) || 0.82
  const genus =
    scientificName &&
    scientificName !== FALLBACK_SCIENTIFIC_NAME &&
    /^[A-Za-z]/.test(scientificName)
      ? scientificName.split(/\s+/)[0] ?? null
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
    watering,
    light,
    temperature,
  }
}

function outcomeFromGeminiText(text: string): PlantIdentificationOutcome | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const plant = parseGeminiPlantJson(trimmed)
  if (!plant) {
    console.warn('[Gemini] could not map response to plant JSON', {
      preview: trimmed.slice(0, 500),
    })
    return null
  }

  const candidate = mapGeminiPlantToCandidate(plant)
  const displayName = candidate.commonNames[0]?.trim() || ''
  const scientific = candidate.scientificName?.trim() || ''

  const hasRealName =
    (displayName.length > 0 && displayName !== FALLBACK_COMMON_NAME) ||
    (scientific.length > 0 && scientific !== FALLBACK_SCIENTIFIC_NAME)

  const hasCarePayload = Boolean(
    candidate.description ||
      candidate.watering ||
      candidate.light ||
      candidate.temperature,
  )

  if (!hasRealName && !hasCarePayload) return null

  console.info('[Gemini] mapped plant fields', {
    name: displayName,
    scientificName: scientific,
    watering: candidate.watering,
    light: candidate.light,
    temperature: candidate.temperature,
    hasDescription: Boolean(candidate.description),
  })

  return {
    ok: true,
    bestMatch: scientific || displayName || FALLBACK_SCIENTIFIC_NAME,
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
    watering: null,
    light: null,
    temperature: null,
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
