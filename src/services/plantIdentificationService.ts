import type {
  IdentifyImageOptions,
  PlantIdentificationCandidate,
  PlantIdentificationOutcome,
  PlantIdentificationPrimarySummary,
  PlantNetIdentifyResponse,
  PlantNetOrgan,
  PlantNetResult,
} from '@/types/plantnet'
import { ServiceError } from '@/services/errors'
import { compressImageForUpload } from '@/services/imageUtils'
import { extractBinomialScientificName } from '@/lib/scientificName'

// ─── Constants ───────────────────────────────────────────────────────────────

const PLANTNET_BASE = 'https://my-api.plantnet.org/v2/identify'
const DEFAULT_PROJECT = 'all'
const DEFAULT_MAX_RESULTS = 5
/** After compression, uploads must stay under this limit. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
/** Accept large camera originals; they are compressed before upload. */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

const FALLBACK_COMMON_NAME = 'نبات غير محدد'
const FALLBACK_SCIENTIFIC_NAME = 'نبات غير محدد'

const VALID_ORGANS: ReadonlySet<PlantNetOrgan> = new Set([
  'auto',
  'leaf',
  'flower',
  'fruit',
  'bark',
  'habit',
  'other',
])

/** Official Pl@ntNet private key — query parameter only. */
const PLANTNET_API_KEY = '2b10d9WpUNeMmsuwvO7MLBaUu'

const ARABIC_SCRIPT = /[\u0600-\u06FF]/

// ─── Public helpers ──────────────────────────────────────────────────────────

/** Key is embedded; always ready for browser calls. */
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

  if (file.size > MAX_SOURCE_BYTES) {
    throw new ServiceError(
      'حجم الصورة كبير جداً. الحد الأقصى 25 ميغابايت قبل الضغط.',
      'FILE_TOO_LARGE',
    )
  }
}

/**
 * Display label: first common name → scientific name → Arabic fallback.
 * Never throws on empty / undefined arrays.
 */
export function displayPlantCommonName(
  candidate: PlantIdentificationCandidate | null | undefined,
  scientificFallback?: string | null,
): string {
  const firstCommon = candidate?.commonNames?.[0]?.trim()
  if (firstCommon) return firstCommon

  const scientific =
    candidate?.scientificName?.trim() ||
    scientificFallback?.trim() ||
    ''
  if (scientific) return scientific

  return FALLBACK_COMMON_NAME
}

/** Normalize a single organ value from UI / options. */
export function normalizeOrgan(value: unknown): PlantNetOrgan {
  if (typeof value === 'string' && VALID_ORGANS.has(value as PlantNetOrgan)) {
    return value as PlantNetOrgan
  }
  return 'auto'
}

/**
 * Resolve the organ(s) for the multipart body.
 * Preference: explicit `organs[]` → single `organ` → `'auto'`.
 */
export function resolveOrgans(options: IdentifyImageOptions = {}): PlantNetOrgan[] {
  if (Array.isArray(options.organs) && options.organs.length > 0) {
    return options.organs.map(normalizeOrgan)
  }
  return [normalizeOrgan(options.organ)]
}

/** Confidence as a 0–100 percentage (Pl@ntNet score is 0–1). */
export function confidencePercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.round(Math.min(Math.max(score, 0), 1) * 100)
}

/** Primary scientific name, commons, family, and confidence from `results[0]`. */
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
  }
}

// ─── Internal: FormData + URL ────────────────────────────────────────────────

/**
 * Official endpoint shape:
 * `https://my-api.plantnet.org/v2/identify/all?api-key=2b10d9WpUNeMmsuwvO7MLBaUu`
 */
function buildIdentifyUrl(project: string): string {
  const safeProject = project.trim() || DEFAULT_PROJECT
  const url = new URL(`${PLANTNET_BASE}/${encodeURIComponent(safeProject)}`)
  url.searchParams.set('api-key', PLANTNET_API_KEY)
  url.searchParams.set('lang', 'ar')
  return url.toString()
}

/**
 * Free CORS proxies for GitHub Pages (browser → proxy → Pl@ntNet).
 * Target URL (including `api-key`) is fully encoded in the query.
 * POST + multipart FormData is forwarded by corsproxy.io.
 */
function buildCorsProxiedUrls(targetUrl: string): string[] {
  const encoded = encodeURIComponent(targetUrl)
  return [
    `https://corsproxy.io/?${encoded}`,
    `https://corsproxy.io/?url=${encoded}`,
  ]
}

function buildIdentifyFormData(file: File, organ: PlantNetOrgan): FormData {
  const formData = new FormData()
  const filename =
    typeof file.name === 'string' && file.name.trim()
      ? file.name.trim()
      : 'plant.jpg'
  // Pl@ntNet expects multipart fields: images + organs (api-key stays in URL)
  formData.append('images', file, filename)
  formData.append('organs', organ)
  return formData
}

function cloneFormData(source: FormData): FormData {
  const next = new FormData()
  for (const [key, value] of source.entries()) {
    next.append(key, value)
  }
  return next
}

function isOriginOrCorsFailure(status: number, body: string): boolean {
  const lower = body.toLowerCase()
  return (
    (status === 403 || status === 0) &&
    (lower.includes('origin') ||
      lower.includes('cors') ||
      lower.includes('not allowed') ||
      lower.includes('unauthorized origin'))
  )
}

function isNetworkCorsError(error: unknown): boolean {
  if (!(error instanceof Error)) return true
  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('cors') ||
    message.includes('load failed') ||
    message.includes('network request failed')
  )
}

// ─── Internal: safe parsing (no undefined throws) ────────────────────────────

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

function readScore(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 1)
}

function orderCommonNames(names: unknown): string[] {
  if (!Array.isArray(names)) return []

  const cleaned = names
    .filter((entry): entry is string => typeof entry === 'string')
    .map((name) => name.trim())
    .filter((name) => name.length > 0)

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

function readTaxonName(value: unknown): string | null {
  const record = asRecord(value)
  if (!record) return null
  return (
    readOptionalString(record.scientificNameWithoutAuthor) ||
    readOptionalString(record.scientificName)
  )
}

/**
 * Map one Pl@ntNet result → app candidate.
 * Never throws on missing nested fields.
 */
function mapCandidate(result: unknown): PlantIdentificationCandidate | null {
  const record = asRecord(result)
  if (!record) return null

  const species = asRecord(record.species)
  if (!species) return null

  const rawScientific =
    readOptionalString(species.scientificNameWithoutAuthor) ||
    readOptionalString(species.scientificName)

  if (!rawScientific) return null

  // Persist clean binomial for downstream Supabase fuzzy matching
  const scientificName =
    extractBinomialScientificName(rawScientific) || rawScientific

  const score = readScore(record.score)
  const gbif = asRecord(record.gbif)
  const gbifId = gbif?.id
  const taxonId =
    gbifId === undefined || gbifId === null
      ? null
      : String(gbifId)

  const commonNames = orderCommonNames(species?.commonNames)
  // Always expose at least one display string (never empty array for UI)
  const safeCommonNames =
    commonNames.length > 0 ? commonNames : [scientificName]

  return {
    scientificName,
    scientificNameAuthorship: readOptionalString(
      species?.scientificNameAuthorship,
    ),
    commonNames: safeCommonNames,
    family: readTaxonName(species?.family),
    genus: readTaxonName(species?.genus),
    score,
    confidencePercent: confidencePercent(score),
    taxonId,
  }
}

function isPlantNetIdentifyResponse(
  value: unknown,
): value is PlantNetIdentifyResponse {
  const record = asRecord(value)
  if (!record) return false
  // Accept payloads that look like identify responses (results and/or bestMatch).
  return (
    Array.isArray(record.results) ||
    typeof record.bestMatch === 'string' ||
    typeof record.remainingIdentificationRequests === 'number'
  )
}

/**
 * Strict mapping of live Pl@ntNet `results` (API order preserved).
 * Top match fields come from `results[0]`.
 */
function parsePlantNetPayload(
  payload: PlantNetIdentifyResponse,
  maxResults: number,
): PlantIdentificationOutcome {
  const rawResults: PlantNetResult[] = Array.isArray(payload.results)
    ? payload.results
    : []

  const limit = Number.isFinite(maxResults)
    ? Math.max(1, Math.floor(maxResults))
    : DEFAULT_MAX_RESULTS

  const candidates = rawResults
    .map(mapCandidate)
    .filter((item): item is PlantIdentificationCandidate => item !== null)
    .slice(0, limit)

  if (candidates.length === 0) {
    return {
      ok: false,
      code: 'NO_RESULTS',
      message:
        'تعذّر التعرف على النبات من الصورة. جرّب صورة أوضح للورقة أو الزهرة بإضاءة جيدة.',
    }
  }

  const primary = candidates[0]
  const bestFromPayload = readOptionalString(payload?.bestMatch)
  const bestMatch =
    (bestFromPayload
      ? extractBinomialScientificName(bestFromPayload) || bestFromPayload
      : null) ||
    primary?.scientificName ||
    FALLBACK_SCIENTIFIC_NAME

  return {
    ok: true,
    bestMatch,
    candidates,
    identifiedAt: new Date().toISOString(),
  }
}

// ─── Internal: Arabic HTTP / network errors ──────────────────────────────────

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
    if (record) {
      const message =
        readOptionalString(record.message) ||
        readOptionalString(record.error) ||
        readOptionalString(record.statusMessage)
      if (message) return message.slice(0, 400)
    }
  } catch {
    /* plain text body */
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
  const lower = detail.toLowerCase()
  const status = response.status

  if (status === 401) {
    return detail
      ? `مفتاح Pl@ntNet غير صالح أو غير مصرّح (401): ${detail}`
      : 'مفتاح Pl@ntNet غير صالح أو غير مصرّح (401). تحقق من المفتاح في لوحة my.plantnet.org.'
  }

  if (status === 403) {
    if (lower.includes('origin') || lower.includes('cors')) {
      return [
        'رُفض الطلب بسبب CORS / النطاق (403).',
        'فعّل Expose my API key وأضف نطاق GitHub Pages إلى Authorized domains.',
        detail ? `التفاصيل: ${detail}` : '',
      ]
        .filter(Boolean)
        .join(' ')
    }
    return detail
      ? `الوصول مرفوض من Pl@ntNet (403): ${detail}`
      : 'الوصول مرفوض من Pl@ntNet (403). تحقق من صلاحيات المفتاح والنطاقات المصرّح بها.'
  }

  if (status === 429) {
    return 'تم تجاوز حد طلبات التعريف (429). حاول مرة أخرى لاحقاً.'
  }

  if (status >= 500) {
    return detail
      ? `خدمة التعريف غير متاحة حالياً (${status}): ${detail}`
      : `خدمة التعريف غير متاحة حالياً (HTTP ${status}). حاول مرة أخرى بعد قليل.`
  }

  const statusLabel = response.statusText
    ? `HTTP ${status} ${response.statusText}`
    : `HTTP ${status}`

  return detail
    ? `فشل طلب التعريف (${statusLabel}): ${detail}`
    : `فشل طلب التعريف (${statusLabel}).`
}

// ─── Public: identify ────────────────────────────────────────────────────────

type FetchAttempt = {
  label: string
  requestUrl: string
}

async function postIdentifyRequest(
  requestUrl: string,
  formData: FormData,
  label: string,
): Promise<{ ok: true; response: Response; body: string } | { ok: false; error: unknown }> {
  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      body: formData,
      // No custom headers — browser sets multipart boundary (avoids extra preflight).
    })
    const body = await response.text()
    console.info(`[PlantNet] ${label}`, {
      status: response.status,
      statusText: response.statusText,
      requestUrl,
      bodyPreview: body.slice(0, 280),
    })
    return { ok: true, response, body }
  } catch (error) {
    console.warn(`[PlantNet] ${label} threw`, { requestUrl, error })
    return { ok: false, error }
  }
}

function parseIdentifyHttpBody(
  body: string,
  maxResults: number,
): PlantIdentificationOutcome | null {
  let rawJson: unknown
  try {
    rawJson = JSON.parse(body) as unknown
  } catch {
    return null
  }
  if (!isPlantNetIdentifyResponse(rawJson)) return null
  return parsePlantNetPayload(rawJson, maxResults)
}

/**
 * Identify a plant image via Pl@ntNet v2.
 *
 * On GitHub Pages, browser Origin is often blocked (403). Requests are sent
 * through free CORS proxies (`corsproxy.io`) that forward POST + FormData
 * to the official URL (api-key remains a query param on the target URL).
 * Parsing / UI contracts stay unchanged.
 */
export async function identifyPlantWithPlantNet(
  file: File,
  options: IdentifyImageOptions = {},
): Promise<PlantIdentificationOutcome> {
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
    console.error('[PlantNet] image compression failed', error)
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

  const project =
    typeof options.project === 'string' && options.project.trim()
      ? options.project.trim()
      : DEFAULT_PROJECT

  const organ = resolveOrgans(options)?.[0] ?? 'auto'
  const maxResults =
    typeof options.maxResults === 'number' && Number.isFinite(options.maxResults)
      ? options.maxResults
      : DEFAULT_MAX_RESULTS

  const plantNetUrl = buildIdentifyUrl(project)
  const baseFormData = buildIdentifyFormData(uploadFile, organ)

  // Proxy-first for static GitHub Pages; direct kept as a final attempt.
  const attempts: FetchAttempt[] = [
    ...buildCorsProxiedUrls(plantNetUrl).map((requestUrl, index) => ({
      label: `cors-proxy-${index + 1}`,
      requestUrl,
    })),
    { label: 'direct', requestUrl: plantNetUrl },
  ]

  const failures: string[] = []
  let lastHttpError: PlantIdentificationOutcome | null = null

  for (const attempt of attempts) {
    const formData = cloneFormData(baseFormData)
    const result = await postIdentifyRequest(
      attempt.requestUrl,
      formData,
      attempt.label,
    )

    if (!result.ok) {
      if (isNetworkCorsError(result.error)) {
        failures.push(
          `${attempt.label}: CORS/network (${result.error instanceof Error ? result.error.message : 'unknown'})`,
        )
        continue
      }
      failures.push(
        `${attempt.label}: ${result.error instanceof Error ? result.error.message : 'request failed'}`,
      )
      continue
    }

    const { response, body } = result

    if (response.ok) {
      try {
        const outcome = parseIdentifyHttpBody(body, maxResults)
        if (outcome) {
          if (outcome.ok) {
            console.info(
              '[PlantNet] top match',
              summarizePrimaryCandidate(outcome),
            )
          }
          return outcome
        }
        lastHttpError = failure(
          'API_ERROR',
          'استجابة غير صالحة من خدمة التعريف (تعذّر قراءة JSON).',
        )
        failures.push(`${attempt.label}: invalid JSON body`)
        continue
      } catch (error) {
        console.error('[PlantNet] mapping failure', error)
        lastHttpError = failure(
          'UNKNOWN',
          'حدث خطأ أثناء معالجة نتائج التعريف.',
        )
        continue
      }
    }

    if (isOriginOrCorsFailure(response.status, body)) {
      failures.push(`${attempt.label}: Origin not allowed (HTTP ${response.status})`)
      // Build a Response-like message without re-consuming body
      lastHttpError = failure(
        'API_ERROR',
        await messageForHttpError(
          new Response(body, {
            status: response.status,
            statusText: response.statusText,
          }),
        ),
      )
      continue
    }

    lastHttpError = failure(
      'API_ERROR',
      await messageForHttpError(
        new Response(body, {
          status: response.status,
          statusText: response.statusText,
        }),
      ),
    )
    failures.push(
      `${attempt.label}: HTTP ${response.status} — ${body.slice(0, 160) || response.statusText}`,
    )
  }

  console.error('[PlantNet] all attempts failed', { plantNetUrl, failures })
  return (
    lastHttpError ??
    failure(
      'NETWORK',
      'تعذّر الاتصال بخدمة التعريف عبر الوكيل أو مباشرة. تحقق من الإنترنت ثم أعد المحاولة.',
    )
  )
}

/**
 * Validate + identify; throws ServiceError with Arabic message on failure.
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
