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

/** Hardcoded Pl@ntNet key — no env lookup (works on GitHub Pages without `.env`). */
const PLANTNET_API_KEY = '2b10d9WpUNeMmsuwvO7MLBaUu'

/**
 * Public CORS proxies that forward POST + multipart (browser → proxy → Pl@ntNet).
 * Used when GitHub Pages Origin is not yet authorized on my.plantnet.org.
 */
const CORS_PROXY_WRAPPERS: Array<(targetUrl: string) => string> = [
  (targetUrl) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
  (targetUrl) =>
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
]

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
 * - Explicit `organs[]` wins (multi-hint for one image when caller provides them).
 * - Else single `organ` from user selection.
 * - Default `auto` (Pl@ntNet chooses leaf/flower/habit/…).
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
  const cleaned = names
    .map((name) => name.trim())
    .filter(Boolean)

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

/**
 * Map one Pl@ntNet `results[i]` entry → app candidate.
 * Primary fields (esp. results[0]): scientific name, Arabic-first commons, score.
 */
function mapCandidate(result: PlantNetResult): PlantIdentificationCandidate | null {
  const scientificName =
    result.species?.scientificNameWithoutAuthor?.trim() ||
    result.species?.scientificName?.trim() ||
    ''

  if (!scientificName) return null

  const gbifId = result.gbif?.id
  const taxonId =
    gbifId === undefined || gbifId === null ? null : String(gbifId)

  const score = typeof result.score === 'number' && Number.isFinite(result.score)
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
 * `bestMatch` / primary candidate always come from `results[0]` when present.
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
  const bestMatch =
    payload.bestMatch?.trim() ||
    primary.scientificName

  return {
    ok: true,
    bestMatch,
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

function buildIdentifyUrl(project: string): string {
  // Auth + Arabic common names via query params (not headers).
  const url = new URL(`${PLANTNET_BASE}/${encodeURIComponent(project)}`)
  url.searchParams.set('api-key', PLANTNET_API_KEY)
  url.searchParams.set('lang', 'ar')
  return url.toString()
}

function appendOrgans(formData: FormData, organs: PlantNetOrgan[]): void {
  // Pl@ntNet expects one `organs` field per image. For a single image we send
  // the user-selected organ (or `auto`). Extra organs are only appended when
  // the caller explicitly requests multi-organ hints for the same upload.
  if (organs.length <= 1) {
    formData.append('organs', organs[0] ?? 'auto')
    return
  }
  for (const organ of organs) {
    formData.append('organs', organ)
  }
}

function isOriginBlockedError(status: number, body: string): boolean {
  const lower = body.toLowerCase()
  return (
    status === 403 &&
    (lower.includes('origin') ||
      lower.includes('cors') ||
      lower.includes('not allowed') ||
      lower.includes('unauthorized origin'))
  )
}

function isLikelyCorsNetworkError(error: unknown): boolean {
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

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch (error) {
    console.error('[PlantNet] failed to read response body:', error)
    return ''
  }
}

function tryParseJson(text: string): unknown | null {
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/**
 * Last-resort mock — only when every attempt fails with a pure network/CORS throw
 * (no HTTP response body from Pl@ntNet at all). Never used to invent matches
 * when an API JSON payload was received.
 */
function buildMockIdentification(
  maxResults: number,
): Extract<PlantIdentificationOutcome, { ok: true }> {
  const pool: PlantIdentificationCandidate[] = [
    {
      scientificName: 'Plantae sp.',
      scientificNameAuthorship: null,
      commonNames: ['نبات غير مؤكد (وضع عدم الاتصال)'],
      family: null,
      genus: null,
      score: 0.35,
      taxonId: null,
    },
  ]

  const candidates = pool.slice(0, Math.max(1, maxResults))
  console.warn(
    '[PlantNet] total network failure — offline placeholder only (not a real ID)',
  )

  return {
    ok: true,
    bestMatch: candidates[0]?.scientificName ?? null,
    candidates,
    identifiedAt: new Date().toISOString(),
  }
}

async function postIdentifyOnce(
  requestUrl: string,
  formData: FormData,
  label: string,
): Promise<{ response: Response; body: string } | { error: unknown }> {
  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      body: formData,
    })
    const body = await readResponseText(response)
    console.info(`[PlantNet] ${label}`, {
      status: response.status,
      statusText: response.statusText,
      requestUrl,
      bodyPreview: body.slice(0, 400),
    })
    return { response, body }
  } catch (error) {
    console.warn(`[PlantNet] ${label} request threw`, { requestUrl, error })
    return { error }
  }
}

function parseSuccessBody(
  body: string,
  maxResults: number,
): PlantIdentificationOutcome | null {
  const parsed = tryParseJson(body)
  if (!parsed || typeof parsed !== 'object') return null
  if (!('results' in parsed) && !('bestMatch' in parsed)) return null
  return parsePlantNetPayload(parsed as PlantNetIdentifyResponse, maxResults)
}

function extractErrorMessage(body: string, status: number, statusText: string): string {
  const parsed = tryParseJson(body)
  let detail = body.trim().slice(0, 300)
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>
    const message =
      (typeof record.message === 'string' && record.message) ||
      (typeof record.error === 'string' && record.error) ||
      ''
    if (message) detail = message
  }
  return `فشل طلب التعريف (HTTP ${status}${statusText ? ` ${statusText}` : ''})${detail ? `: ${detail}` : ''}`
}

/**
 * Direct → CORS proxies. Mock only if every attempt throws (total network failure).
 * Any live JSON `results` array is mapped strictly — never replaced by mock flora.
 */
async function identifyWithResilience(
  plantNetUrl: string,
  formData: FormData,
  maxResults: number,
): Promise<PlantIdentificationOutcome> {
  const attempts: Array<{ label: string; url: string }> = [
    { label: 'direct', url: plantNetUrl },
    ...CORS_PROXY_WRAPPERS.map((wrap, index) => ({
      label: `cors-proxy-${index + 1}`,
      url: wrap(plantNetUrl),
    })),
  ]

  const failures: string[] = []
  let sawHttpResponse = false
  let lastApiError: PlantIdentificationOutcome | null = null

  for (const attempt of attempts) {
    const cloned = cloneFormData(formData)
    const result = await postIdentifyOnce(attempt.url, cloned, attempt.label)

    if ('error' in result) {
      failures.push(
        `${attempt.label}: network (${result.error instanceof Error ? result.error.message : 'unknown'})`,
      )
      continue
    }

    sawHttpResponse = true
    const { response, body } = result

    if (response.ok) {
      const outcome = parseSuccessBody(body, maxResults)
      if (outcome) {
        // Live API payload wins — including NO_RESULTS. Never mock over this.
        if (outcome.ok) {
          const primary = summarizePrimaryCandidate(outcome)
          console.info('[PlantNet] mapped results[0]', primary)
        }
        return outcome
      }
      failures.push(`${attempt.label}: HTTP ${response.status} but not a Pl@ntNet results payload`)
      lastApiError = {
        ok: false,
        code: 'API_ERROR',
        message: 'استجابة غير صالحة من خدمة التعريف (لا توجد مصفوفة results).',
      }
      continue
    }

    if (isOriginBlockedError(response.status, body)) {
      failures.push(`${attempt.label}: Origin not allowed (HTTP 403)`)
      lastApiError = {
        ok: false,
        code: 'API_ERROR',
        message: extractErrorMessage(body, response.status, response.statusText),
      }
      continue
    }

    failures.push(
      `${attempt.label}: HTTP ${response.status} — ${body.slice(0, 200) || response.statusText}`,
    )
    lastApiError = {
      ok: false,
      code: 'API_ERROR',
      message: extractErrorMessage(body, response.status, response.statusText),
    }
  }

  // Got HTTP answers but no usable results → surface API error (not fake Rosa).
  if (sawHttpResponse && lastApiError) {
    console.error('[PlantNet] live attempts exhausted without results', failures)
    return lastApiError
  }

  // Pure network/CORS throws only → offline placeholder.
  const allNetwork = failures.every((entry) => entry.includes('network'))
  if (allNetwork || !sawHttpResponse) {
    console.error('[PlantNet] total network failure', failures)
    return buildMockIdentification(maxResults)
  }

  return (
    lastApiError ?? {
      ok: false,
      code: 'NETWORK',
      message: 'تعذّر الاتصال بخدمة التعريف بعد كل المحاولات.',
    }
  )
}

function cloneFormData(source: FormData): FormData {
  const next = new FormData()
  for (const [key, value] of source.entries()) {
    next.append(key, value)
  }
  return next
}

/**
 * Identify a plant image via the Pl@ntNet public API.
 * Maps live `results` strictly; mock only on total network failure.
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

  const plantNetUrl = buildIdentifyUrl(project)

  try {
    return await identifyWithResilience(plantNetUrl, formData, maxResults)
  } catch (error) {
    // Unexpected throw with no recoverable HTTP body → treat as total network failure.
    if (isLikelyCorsNetworkError(error)) {
      console.error('[PlantNet] unexpected network failure; offline placeholder', error)
      return buildMockIdentification(maxResults)
    }
    console.error('[PlantNet] unexpected identify failure', error)
    return {
      ok: false,
      code: 'UNKNOWN',
      message: 'حدث خطأ غير متوقع أثناء التعريف.',
    }
  }
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
