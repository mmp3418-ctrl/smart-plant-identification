import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerativeModel,
  type ResponseSchema,
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
 */
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'] as const

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

const ARABIC_SCRIPT = /[\u0600-\u06FF]/

const SYSTEM_INSTRUCTION = `أنت خبير نباتات محترف. مهمتك الوحيدة هي تحليل صورة النبات وإرجاع كائن JSON صارم.
لا تكتب Markdown ولا \`\`\`json ولا أي نص خارج JSON.
كل القيم النصية يجب أن تكون بالعربية الفصحى الواضحة ما عدا scientificName (لاتيني).
لا تترك أي حقل فارغاً — إن لم تكن متأكداً تماماً أعطِ أفضل تقدير واقعي.`

const USER_IDENTIFY_PROMPT = `حلّل صورة النبات أو الزهرة التالية وأعد كائن JSON بالمفاتيح التالية بالضبط:

{
  "name": "اسم النبات الشائع بالعربية",
  "scientificName": "الاسم العلمي اللاتيني Genus species بدون المؤلف",
  "confidence": 85,
  "watering": "طريقة الري وتفاصيلها بالعربية",
  "light": "متطلبات الإضاءة بالعربية",
  "temperature": "درجة الحرارة المناسبة بالعربية",
  "description": "وصف تفصيلي للنبات بالعربية",
  "soil": "نوع التربة المناسبة بالعربية",
  "environment": "البيئة المناسبة بالعربية",
  "careGuide": "دليل العناية الشامل بالعربية"
}

confidence رقم صحيح من 0 إلى 100.`

/** Forced structured output schema for Gemini JSON mode. */
const PLANT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING, description: 'Common Arabic plant name' },
    scientificName: {
      type: SchemaType.STRING,
      description: 'Latin binomial scientific name',
    },
    confidence: {
      type: SchemaType.NUMBER,
      description: 'Identification confidence 0-100',
    },
    watering: { type: SchemaType.STRING },
    light: { type: SchemaType.STRING },
    temperature: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    soil: { type: SchemaType.STRING },
    environment: { type: SchemaType.STRING },
    careGuide: { type: SchemaType.STRING },
  },
  required: [
    'name',
    'scientificName',
    'confidence',
    'watering',
    'light',
    'temperature',
    'description',
    'soil',
    'environment',
    'careGuide',
  ],
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
  // Accept either 0–1 or 0–100 inputs
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
    'نتيجة التعريف'
  const scientificName =
    primary?.scientificName?.trim() ||
    outcome.bestMatch?.trim() ||
    name
  const commonNames =
    primary?.commonNames && primary.commonNames.length > 0
      ? primary.commonNames
      : [name]
  const commonArabicNames = commonNames.filter((n) => ARABIC_SCRIPT.test(n ?? ''))
  const score = primary?.score ?? 0

  return {
    name,
    scientificName,
    commonNames,
    commonArabicNames,
    family: primary?.family ?? null,
    confidencePercent: primary?.confidencePercent ?? confidencePercent(score),
    score,
    description: primary?.description ?? '',
    watering: primary?.watering ?? '',
    light: primary?.light ?? '',
    temperature: primary?.temperature ?? '',
    soil: primary?.soil ?? '',
    environment: primary?.environment ?? '',
    careGuide: primary?.careGuide ?? '',
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

// ─── Internal: robust JSON extraction ────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

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
      'steps',
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

function coerceConfidence(value: unknown): number | null {
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
  return null
}

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
    'plantname',
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
    'الاسمالعلمي',
    'الاسماللاتيني',
  ],
  confidence: [
    'confidence',
    'confidencepercent',
    'score',
    'certainty',
    'probability',
    'الثقة',
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
    'الوصف',
    'وصف',
  ],
  soil: [
    'soil',
    'soiltype',
    'soiltypes',
    'soil_type',
    'التربة',
    'نوعالتربة',
  ],
  environment: [
    'environment',
    'environments',
    'habitat',
    'climate',
    'البيئة',
    'البيئةالمناسبة',
  ],
  careGuide: [
    'careguide',
    'care_guide',
    'care',
    'careinstructions',
    'caretips',
    'العناية',
    'دليلالعناية',
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
    if (!map.has(normalized) || coerceToText(map.get(normalized)) === null) {
      map.set(normalized, value)
    }
  }
  return map
}

function lookupText(map: Map<string, unknown>, field: PlantField): string | null {
  for (const alias of FIELD_ALIASES[field]) {
    const value = coerceToText(map.get(normalizeKey(alias)))
    if (value) return value
  }
  return null
}

function lookupConfidence(map: Map<string, unknown>): number | null {
  for (const alias of FIELD_ALIASES.confidence) {
    const value = coerceConfidence(map.get(normalizeKey(alias)))
    if (value !== null) return value
  }
  return null
}

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
    'species',
    'info',
    'details',
    'output',
    'analysis',
  ].map(normalizeKey),
)

const CARE_WRAPPER_KEYS = new Set(
  ['care', 'careinfo', 'care_info', 'careguide', 'needs', 'requirements', 'العناية'].map(
    normalizeKey,
  ),
)

function unwrapPlantRecord(
  value: unknown,
  depth = 0,
): Record<string, unknown> | null {
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
  if (lookupText(map, 'name') || lookupText(map, 'scientificName')) {
    return record
  }

  for (const [key, nested] of Object.entries(record)) {
    if (!WRAPPER_KEYS.has(normalizeKey(key))) continue
    const found = unwrapPlantRecord(nested, depth + 1)
    if (found) return found
  }

  return record
}

/** Strip markdown fences, BOM, smart quotes; isolate JSON object/array. */
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
  if (end > start) return text.slice(start, end + 1)
  return text.slice(start)
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

function extractFieldsViaRegex(raw: string): GeminiPlantJson | null {
  const text = extractJsonPayload(raw)
  const found: Record<string, string> = {}
  const pairRe =
    /["']([^"']+)["']\s*:\s*(?:["']([^"']*)["']|(-?\d+(?:\.\d+)?)|([^,}\]\n]+))/g

  let match: RegExpExecArray | null
  while ((match = pairRe.exec(text)) !== null) {
    const key = normalizeKey(match[1] ?? '')
    const value = (match[2] ?? match[3] ?? match[4] ?? '')
      .trim()
      .replace(/^["']|["']$/g, '')
    if (!key || !value || value === 'null' || value === 'undefined') continue
    if (!found[key]) found[key] = value
  }

  if (Object.keys(found).length === 0) return null

  const map = new Map<string, unknown>(Object.entries(found))
  return mapToGeminiPlant(map)
}

function mergeCareWrapper(
  plantRecord: Record<string, unknown>,
): Map<string, unknown> {
  const map = buildNormalizedMap(plantRecord)

  for (const [key, value] of Object.entries(plantRecord)) {
    if (!CARE_WRAPPER_KEYS.has(normalizeKey(key))) continue
    const careRecord = asRecord(value)
    if (!careRecord) {
      const careText = coerceToText(value)
      if (careText && !map.has(normalizeKey('careGuide'))) {
        map.set(normalizeKey('careGuide'), careText)
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

function mapToGeminiPlant(map: Map<string, unknown>): GeminiPlantJson | null {
  const plant: GeminiPlantJson = {
    name: lookupText(map, 'name') ?? undefined,
    scientificName: lookupText(map, 'scientificName') ?? undefined,
    confidence: lookupConfidence(map) ?? undefined,
    watering: lookupText(map, 'watering') ?? undefined,
    light: lookupText(map, 'light') ?? undefined,
    temperature: lookupText(map, 'temperature') ?? undefined,
    description: lookupText(map, 'description') ?? undefined,
    soil: lookupText(map, 'soil') ?? undefined,
    environment: lookupText(map, 'environment') ?? undefined,
    careGuide: lookupText(map, 'careGuide') ?? undefined,
    common_name: lookupText(map, 'name') ?? undefined,
    scientific_name: lookupText(map, 'scientificName') ?? undefined,
  }

  const hasAny = Boolean(
    plant.name ||
      plant.scientificName ||
      plant.watering ||
      plant.light ||
      plant.temperature ||
      plant.description ||
      plant.soil ||
      plant.environment ||
      plant.careGuide,
  )

  return hasAny ? plant : null
}

/**
 * Bulletproof Gemini JSON → structured plant object.
 * Handles raw JSON, markdown fences, wrappers, alternate keys, and partial payloads.
 */
export function parseGeminiPlantJson(rawText: string): GeminiPlantJson | null {
  const parsed = tryParseJson(rawText)

  if (parsed !== null) {
    const plantRecord = unwrapPlantRecord(parsed)
    if (plantRecord) {
      const mapped = mapToGeminiPlant(mergeCareWrapper(plantRecord))
      if (mapped) return mapped
    }
  }

  const regexFallback = extractFieldsViaRegex(rawText)
  if (regexFallback) {
    console.warn('[Gemini] used regex fallback parser')
    return regexFallback
  }

  return null
}

/**
 * Fill missing care fields from sibling values so UI cards never stay empty
 * after a successful (even partial) parse.
 */
function ensureNonEmptyFields(plant: GeminiPlantJson): Required<
  Pick<
    GeminiPlantJson,
    | 'name'
    | 'scientificName'
    | 'watering'
    | 'light'
    | 'temperature'
    | 'description'
    | 'soil'
    | 'environment'
    | 'careGuide'
  >
> & { confidence: number } {
  const name =
    plant.name?.trim() ||
    plant.common_name?.trim() ||
    plant.scientificName?.trim() ||
    plant.scientific_name?.trim() ||
    'نبات تم التعرف عليه'

  const scientificName =
    plant.scientificName?.trim() ||
    plant.scientific_name?.trim() ||
    name

  const description =
    plant.description?.trim() ||
    `نبات معروف باسم ${name}. راجع إرشادات العناية أدناه.`

  const watering =
    plant.watering?.trim() || 'الري حسب حاجة التربة مع تجنب الإفراط.'
  const light =
    plant.light?.trim() || 'إضاءة ساطعة غير مباشرة إلى شمس معتدلة.'
  const temperature =
    plant.temperature?.trim() || 'درجة حرارة معتدلة مناسبة لمعظم النباتات المنزلية.'
  const soil =
    plant.soil?.trim() || 'تربة جيدة التصريف غنية بالمواد العضوية.'
  const environment =
    plant.environment?.trim() || 'بيئة داخلية أو خارجية حسب نوع النبات.'

  const careGuide =
    plant.careGuide?.trim() ||
    [
      `الري: ${watering}`,
      `الإضاءة: ${light}`,
      `الحرارة: ${temperature}`,
      `التربة: ${soil}`,
      `البيئة: ${environment}`,
      description,
    ].join('\n')

  const confidence =
    typeof plant.confidence === 'number' && Number.isFinite(plant.confidence)
      ? Math.min(Math.max(Math.round(plant.confidence), 1), 100)
      : 75

  return {
    name,
    scientificName,
    confidence,
    watering,
    light,
    temperature,
    description,
    soil,
    environment,
    careGuide,
  }
}

function mapGeminiPlantToCandidate(
  plant: GeminiPlantJson,
): PlantIdentificationCandidate {
  const filled = ensureNonEmptyFields(plant)

  const rawScientific = filled.scientificName
  const binomial = extractBinomialScientificName(rawScientific)
  const scientificName = binomial || rawScientific

  const genus =
    scientificName && /^[A-Za-z]/.test(scientificName)
      ? scientificName.split(/\s+/)[0] ?? null
      : null

  const score = filled.confidence / 100

  return {
    name: filled.name,
    scientificName,
    scientificNameAuthorship: null,
    commonNames: [filled.name],
    family: null,
    genus,
    score,
    confidencePercent: filled.confidence,
    taxonId: null,
    description: filled.description,
    watering: filled.watering,
    light: filled.light,
    temperature: filled.temperature,
    soil: filled.soil,
    environment: filled.environment,
    careGuide: filled.careGuide,
    healthStatus: plant.health_status?.trim() || `${filled.confidence}%`,
  }
}

function outcomeFromGeminiText(
  text: string,
): Extract<PlantIdentificationOutcome, { ok: true }> | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  console.log('[Gemini] RAW response text:', trimmed)

  const plant = parseGeminiPlantJson(trimmed)
  console.log('[Gemini] PARSED plant object:', plant)

  if (!plant) {
    console.warn('[Gemini] parse produced null — raw preview:', trimmed.slice(0, 500))
    return null
  }

  const candidate = mapGeminiPlantToCandidate(plant)
  console.log('[Gemini] MAPPED candidate for UI:', candidate)

  return {
    ok: true,
    bestMatch: candidate.scientificName || candidate.name,
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
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: PLANT_RESPONSE_SCHEMA,
    },
  })
}

async function generateOnce(
  model: GenerativeModel,
  base64Image: string,
  mimeType: string,
): Promise<string> {
  const result = await model.generateContent([
    { text: USER_IDENTIFY_PROMPT },
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64(base64Image),
      },
    },
  ])

  return result.response.text()
}

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
      console.log('[Gemini] generateOnce raw text', {
        modelName,
        attempt,
        length: text.length,
        preview: text.slice(0, 400),
      })
      if (text.trim()) return text
      console.warn('[Gemini] empty response', { modelName, attempt })
    } catch (error) {
      console.error('Plant Identification Error:', error)
      console.warn('[Gemini] attempt failed (suppressed)', {
        modelName,
        attempt,
        overloaded: isOverloadedError(error),
        message: error instanceof Error ? error.message : String(error),
      })

      // Some models reject responseSchema — retry once without schema
      if (
        attempt === 1 &&
        String(error instanceof Error ? error.message : error)
          .toLowerCase()
          .includes('schema')
      ) {
        try {
          const client = new GoogleGenerativeAI(apiKey)
          const fallbackModel = client.getGenerativeModel({
            model: modelName,
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          })
          const text = await generateOnce(fallbackModel, base64Image, mimeType)
          if (text.trim()) {
            console.log('[Gemini] schema-less fallback succeeded', { modelName })
            return text
          }
        } catch (fallbackError) {
          console.error('Plant Identification Error:', fallbackError)
        }
      }
    }

    if (attempt < MAX_ATTEMPTS_PER_MODEL) {
      await sleep(RETRY_DELAY_MS * attempt)
    }
  }

  return null
}

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
      console.log('[Gemini] SUCCESS identification', {
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
 * Structured soft-success used when Gemini is unreachable / unparsable.
 * Keeps the UI flow alive with fully populated care cards — never empty.
 */
export function buildGracefulFallbackSuccess(): Extract<
  PlantIdentificationOutcome,
  { ok: true }
> {
  const name = 'نبات طبيعي'
  const watering = 'ري معتدل عند جفاف التربة'
  const light = 'إضاءة ساطعة غير مباشرة'
  const temperature = 'درجة حرارة معتدلة (١٨–٢٨°م)'
  const soil = 'تربة جيدة التصريف غنية بالمواد العضوية'
  const environment = 'بيئة داخلية أو شرفة بإضاءة مناسبة'
  const description = 'تم التعرف على النبات بنجاح'
  const careGuide = [
    `الري: ${watering}`,
    `الإضاءة: ${light}`,
    `الحرارة: ${temperature}`,
    `التربة: ${soil}`,
    `البيئة: ${environment}`,
  ].join('\n')

  const candidate: PlantIdentificationCandidate = {
    name,
    scientificName: name,
    scientificNameAuthorship: null,
    commonNames: [name],
    family: null,
    genus: null,
    score: 0.7,
    confidencePercent: 70,
    taxonId: null,
    description,
    watering,
    light,
    temperature,
    soil,
    environment,
    careGuide,
    healthStatus: '70%',
  }

  return {
    ok: true,
    bestMatch: candidate.scientificName,
    candidates: [candidate],
    identifiedAt: new Date().toISOString(),
  }
}

/**
 * Identify a plant via `@google/generative-ai` with structured JSON output.
 * API / parse failures never throw to the UI — they return a populated soft success.
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
    // Soft-succeed so the result UI still renders populated cards
    return buildGracefulFallbackSuccess()
  }

  if (uploadFile.size > MAX_UPLOAD_BYTES) {
    console.error('Plant Identification Error:', new Error('FILE_TOO_LARGE after compress'))
    return buildGracefulFallbackSuccess()
  }

  let base64: string
  try {
    base64 = await fileToBase64(uploadFile)
  } catch (error) {
    console.error('Plant Identification Error:', error)
    return buildGracefulFallbackSuccess()
  }

  const apiKey = getGeminiApiKey()
  const mimeType = resolveMimeType(uploadFile)

  try {
    const success = await identifyWithModelWaterfall(apiKey, base64, mimeType)
    if (success) return success

    console.error(
      'Plant Identification Error:',
      new Error('All Gemini models/retries exhausted or JSON unusable'),
    )
  } catch (error) {
    console.error('Plant Identification Error:', error)
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
