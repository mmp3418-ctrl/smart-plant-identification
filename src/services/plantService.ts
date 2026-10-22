import type {
  IdentifyImageOptions,
  NormalizedPlantMatch,
  PlantCareInfo,
  PlantIdentificationCandidate,
  PlantIdentificationOutcome,
  PlantIdentificationPrimarySummary,
  PlantNetIdentifyResponse,
  PlantNetResult,
} from '@/types/identification'
import { ServiceError } from '@/services/errors'
import { compressImageForUpload } from '@/services/imageUtils'
import { extractBinomialScientificName } from '@/lib/scientificName'
// ─── Constants ───────────────────────────────────────────────────────────────

const PLANTNET_BASE_URL = 'https://my-api.plantnet.org/v2/identify/all'

/**
 * Prefer Vite env at build time; fall back to embedded key so production
 * never fails when `VITE_PLANTNET_API_KEY` was not injected during deploy.
 */
const API_KEY =
  (typeof import.meta.env.VITE_PLANTNET_API_KEY === 'string' &&
  import.meta.env.VITE_PLANTNET_API_KEY.trim() &&
  import.meta.env.VITE_PLANTNET_API_KEY.trim() !== 'undefined'
    ? import.meta.env.VITE_PLANTNET_API_KEY.trim()
    : '') || '2b10dRfDh71QvSzCP4smdtYoZe'

/**
 * Soft floor for logging only. Any mappable `results[0]` is shown to the UI
 * (Pl@ntNet flower matches often land around 5–15%).
 */
const MIN_CONFIDENCE_SCORE = 0.05

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
  return API_KEY.length > 0
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
    isPlant: outcome.isPlant,
    message: outcome.message,
  }
}

// ─── Care guidelines (Arabic, species-aware heuristics) ──────────────────────

function textBlob(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase()
}

/**
 * Build structured Arabic care tips from taxonomy signals.
 * Pl@ntNet does not return care fields — this derives practical defaults
 * from family / genus / scientific name, never invents a fake species identity.
 */
export function buildCareInfo(params: {
  scientificName: string
  family: string
  genus?: string | null
}): PlantCareInfo {
  const blob = textBlob(params.scientificName, params.family, params.genus)

  const isCactusOrSucculent =
    /cact|succul|aloe|agave|crassul|euphorbi|sedum|echeveria|haworth|kalancho|sansevier|dracaena|opuntia|mammillaria|lithops/.test(
      blob,
    )
  const isFern =
    /fern|polypodi|adiantum|nephrolepis|pterid|asplenium|dryopter/.test(blob)
  const isOrchid = /orchid|phalaenopsis|dendrobium|cattleya|vanda/.test(blob)
  const isPalm = /palm|arecaceae|phoenix|chamaedorea|washingtonia|cocos/.test(
    blob,
  )
  const isAquatic =
    /nymphaea|lemna|pistia|water|aquatic|hydrocharit|potamogeton/.test(blob)
  const isHerb =
    /lamiaceae|mentha|ocimum|rosmarinus|thymus|origanum|petroselin|coriandrum/.test(
      blob,
    )
  const isTropical =
    /musa|monstera|philodendron|calathea|maranta|alocasia|colocasia|ficus|hibiscus/.test(
      blob,
    )

  if (isCactusOrSucculent) {
    return {
      watering: 'ري متباعد؛ اترك التربة تجف تماماً بين الريات وتجنب تجمع الماء.',
      light: 'ضوء ساطع مباشر إلى شمس كاملة معظم اليوم.',
      temperature: '١٨–٣٢°م مع حماية من الصقيع.',
      soil: 'تربة رملية خفيفة وسريعة التصريف مخصصة للصبار والعصاريات.',
    }
  }

  if (isFern) {
    return {
      watering: 'حافظ على رطوبة التربة دون إغراق؛ رش الأوراق لرفع الرطوبة.',
      light: 'ظل جزئي أو إضاءة ساطعة غير مباشرة — تجنّب الشمس الحارقة.',
      temperature: '١٦–٢٤°م مع رطوبة مرتفعة.',
      soil: 'تربة عضوية غنية جيدة الاحتفاظ بالرطوبة مع تصريف معتدل.',
    }
  }

  if (isOrchid) {
    return {
      watering: 'ري معتدل عند جفاف الوسط؛ لا تترك الجذور في ماء راكد.',
      light: 'إضاءة ساطعة غير مباشرة؛ تجنّب أشعة الظهيرة المباشرة.',
      temperature: '١٨–٢٨°م مع فرق طفيف بين الليل والنهار.',
      soil: 'وسط بساتين (لحاء / ألياف) جيد التهوية وسريع التصريف.',
    }
  }

  if (isPalm) {
    return {
      watering: 'ري منتظم مع السماح بسطح التربة بالجفاف قليلاً بين الريات.',
      light: 'شمس معتدلة إلى إضاءة ساطعة؛ بعض الأنواع تتحمل الظل الجزئي.',
      temperature: '١٨–٣٠°م بعيداً عن تيارات الهواء الباردة.',
      soil: 'تربة طميية جيدة التصريف غنية بالمواد العضوية.',
    }
  }

  if (isAquatic) {
    return {
      watering: 'يحتاج بيئة مائية دائمة أو تربة مشبعة حسب النوع.',
      light: 'شمس كاملة إلى جزئية بحسب نوع النبات المائي.',
      temperature: '١٨–٢٨°م في مياه نظيفة جيدة التهوية.',
      soil: 'وسط مائي أو طين مائي مخصص للنباتات المائية.',
    }
  }

  if (isHerb) {
    return {
      watering: 'ري منتظم عند جفاف السطح؛ تجنّب الإفراط ليبقى الطعم مركزاً.',
      light: 'شمس كاملة ٦ ساعات يومياً على الأقل.',
      temperature: '١٥–٢٨°م في مكان جيد التهوية.',
      soil: 'تربة خفيفة خصبة جيدة التصريف.',
    }
  }

  if (isTropical) {
    return {
      watering: 'ري معتدل عند جفاف السطح؛ حافظ على رطوبة جوية معتدلة.',
      light: 'إضاءة ساطعة غير مباشرة؛ تجنّب الحرق من الشمس المباشرة.',
      temperature: '١٨–٢٩°م بعيداً عن البرودة المفاجئة.',
      soil: 'تربة غنية جيدة التصريف مع مادة عضوية.',
    }
  }

  // General healthy houseplant / outdoor default
  return {
    watering: 'ري معتدل عند جفاف الطبقة السطحية من التربة؛ تجنّب الإفراط.',
    light: 'إضاءة ساطعة غير مباشرة إلى شمس معتدلة حسب تحمّل النوع.',
    temperature: '١٦–٢٨°م في بيئة مستقرة بعيداً عن التيارات القاسية.',
    soil: 'تربة زراعية جيدة التصريف غنية بالمواد العضوية.',
  }
}

function careInfoToGuide(care: PlantCareInfo): string {
  return [
    `الري: ${care.watering}`,
    `الإضاءة: ${care.light}`,
    `درجة الحرارة: ${care.temperature}`,
    `التربة: ${care.soil}`,
  ].join('\n')
}

// ─── Response mapping ────────────────────────────────────────────────────────

function readOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function mapResultToCandidate(result: PlantNetResult): PlantIdentificationCandidate | null {
  const species = result.species
  if (!species) return null

  const commonNames = (Array.isArray(species.commonNames) ? species.commonNames : [])
    .map((n) => (typeof n === 'string' ? n.trim() : ''))
    .filter(Boolean)

  const rawScientific =
    readOptionalString(species.scientificNameWithoutAuthor) ||
    readOptionalString(species.scientificName) ||
    null

  // Prefer commonNames[0], fall back to scientific name (and vice versa)
  const scientificName = rawScientific
    ? extractBinomialScientificName(rawScientific) || rawScientific
    : commonNames[0] || null

  const commonName = commonNames[0] || scientificName
  if (!commonName || !scientificName) return null

  const family =
    readOptionalString(species.family?.scientificNameWithoutAuthor) ||
    readOptionalString(species.family?.scientificName) ||
    'غير محدد'
  const genus =
    readOptionalString(species.genus?.scientificNameWithoutAuthor) ||
    readOptionalString(species.genus?.scientificName) ||
    (scientificName.includes(' ') ? scientificName.split(/\s+/)[0] ?? null : null)

  const score =
    typeof result.score === 'number' && Number.isFinite(result.score)
      ? Math.min(Math.max(result.score, 0), 1)
      : 0
  const confidence = Math.round(score * 100)

  const careInfo = buildCareInfo({
    scientificName,
    family,
    genus,
  })

  return {
    name: commonName,
    commonName,
    scientificName,
    scientificNameAuthorship:
      readOptionalString(species.scientificNameAuthorship),
    commonNames: commonNames.length > 0 ? commonNames : [commonName],
    family,
    genus,
    score,
    confidencePercent: confidence,
    taxonId: null,
    description: `نبات من عائلة ${family}. راجع إرشادات العناية أدناه.`,
    watering: careInfo.watering,
    light: careInfo.light,
    temperature: careInfo.temperature,
    soil: careInfo.soil,
    environment: null,
    careGuide: careInfoToGuide(careInfo),
    careInfo,
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
  }
}

function mapPlantNetResponse(
  payload: PlantNetIdentifyResponse,
  maxResults: number,
): Extract<PlantIdentificationOutcome, { ok: true }> | Extract<
  PlantIdentificationOutcome,
  { ok: false }
> {
  const results = Array.isArray(payload.results) ? payload.results : []

  if (results.length === 0) {
    console.warn('[Pl@ntNet] empty results[] — showing unrecognized message')
    return {
      ok: false,
      code: 'NO_RESULTS',
      message: PLANTNET_UNRECOGNIZED_MESSAGE,
    }
  }

  // Pl@ntNet already ranks by score; keep a defensive sort and map all usable rows
  const ranked = [...results].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  const candidates = ranked
    .map((result, index) => {
      const mapped = mapResultToCandidate(result)
      if (!mapped) {
        console.warn('[Pl@ntNet] could not map result index', index, result)
      }
      return mapped
    })
    .filter((c): c is PlantIdentificationCandidate => Boolean(c))
    .slice(0, Math.max(1, maxResults))

  // If results[] has items, take the top mapped match (results[0] after sort)
  const top = candidates[0]
  if (!top) {
    console.warn('[Pl@ntNet] results present but mapping failed', results[0])
    return {
      ok: false,
      code: 'NO_RESULTS',
      message: PLANTNET_UNRECOGNIZED_MESSAGE,
    }
  }

  if (top.score < MIN_CONFIDENCE_SCORE) {
    console.warn('[Pl@ntNet] low score — still showing result', {
      score: top.score,
      min: MIN_CONFIDENCE_SCORE,
      commonName: top.commonName,
      scientificName: top.scientificName,
    })
  }

  console.log('[Pl@ntNet] top match', {
    commonName: top.commonName,
    scientificName: top.scientificName,
    confidence: top.confidencePercent,
    family: top.family,
  })

  return {
    ok: true,
    isPlant: true,
    message: null,
    bestMatch: top.scientificName,
    primary: toNormalizedMatch(top),
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

// ─── API call ────────────────────────────────────────────────────────────────

async function callPlantNetIdentify(
  imageFile: File,
  organ: string,
): Promise<PlantNetIdentifyResponse> {
  const url = new URL(PLANTNET_BASE_URL)
  url.searchParams.set('api-key', API_KEY)
  url.searchParams.set('include-related-images', 'false')
  url.searchParams.set('no-reject', 'false')
  url.searchParams.set('lang', 'ar')

  const form = new FormData()
  form.append('images', imageFile, imageFile.name || 'plant.jpg')
  form.append('organs', organ)

  console.log('[Pl@ntNet] identify request', {
    endpoint: `${PLANTNET_BASE_URL}?api-key=***`,
    hasApiKey: Boolean(API_KEY),
    organ,
    fileName: imageFile.name,
    fileSize: imageFile.size,
    fileType: imageFile.type,
  })

  let response: Response
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      body: form,
    })
  } catch (error) {
    console.error('Plant Identification Error:', error)
    throw new ServiceError(PLANTNET_UNRECOGNIZED_MESSAGE, 'NETWORK')
  }

  const bodyText = await response.text()

  if (!response.ok) {
    console.error('Plant Identification Error:', {
      status: response.status,
      body: bodyText.slice(0, 400),
    })
    // 404 = species not found / not a plant for Pl@ntNet
    throw new ServiceError(PLANTNET_UNRECOGNIZED_MESSAGE, 'API_ERROR')
  }

  let data: PlantNetIdentifyResponse
  try {
    data = JSON.parse(bodyText) as PlantNetIdentifyResponse
  } catch (error) {
    console.error('Plant Identification Error:', error)
    throw new ServiceError(PLANTNET_UNRECOGNIZED_MESSAGE, 'API_ERROR')
  }

  console.log('Pl@ntNet Response:', data)
  return data
}

// ─── Public identify ─────────────────────────────────────────────────────────

/**
 * Core platform engine: identify a plant image exclusively via Pl@ntNet v2.
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
    return failure('INVALID_FILE')
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
    return failure('INVALID_FILE')
  }

  if (uploadFile.size > MAX_UPLOAD_BYTES) {
    return failure('FILE_TOO_LARGE')
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
    return failure('API_ERROR')
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
