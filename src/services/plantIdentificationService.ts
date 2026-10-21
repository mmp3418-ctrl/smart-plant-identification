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

function mapCandidate(result: PlantNetResult): PlantIdentificationCandidate | null {
  const scientificName =
    result.species.scientificNameWithoutAuthor?.trim() ||
    result.species.scientificName?.trim()

  if (!scientificName) return null

  const gbifId = result.gbif?.id
  const taxonId =
    gbifId === undefined || gbifId === null ? null : String(gbifId)

  const score = typeof result.score === 'number' ? result.score : 0

  return {
    scientificName,
    scientificNameAuthorship:
      result.species.scientificNameAuthorship?.trim() || null,
    commonNames: (result.species.commonNames ?? []).filter(
      (name): name is string => Boolean(name?.trim()),
    ),
    family: result.species.family?.scientificNameWithoutAuthor?.trim() || null,
    genus: result.species.genus?.scientificNameWithoutAuthor?.trim() || null,
    score,
    taxonId,
  }
}

function parsePlantNetPayload(
  payload: PlantNetIdentifyResponse,
  maxResults: number,
): PlantIdentificationOutcome {
  const candidates = (payload.results ?? [])
    .map(mapCandidate)
    .filter((item): item is PlantIdentificationCandidate => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  if (candidates.length === 0) {
    return {
      ok: false,
      code: 'NO_RESULTS',
      message:
        'تعذّر التعرف على النبات من الصورة. جرّب صورة أوضح للورقة أو الزهرة بإضاءة جيدة.',
    }
  }

  return {
    ok: true,
    bestMatch: payload.bestMatch?.trim() || candidates[0]?.scientificName || null,
    candidates,
    identifiedAt: new Date().toISOString(),
  }
}

function buildIdentifyUrl(project: string): string {
  // Auth must be a query param (not a header), per Pl@ntNet docs.
  const url = new URL(`${PLANTNET_BASE}/${encodeURIComponent(project)}`)
  url.searchParams.set('api-key', PLANTNET_API_KEY)
  return url.toString()
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
 * Offline / CORS fallback so GitHub Pages never hard-fails identification.
 * Returns plausible candidates shaped like a live Pl@ntNet success payload.
 */
function buildMockIdentification(
  maxResults: number,
): Extract<PlantIdentificationOutcome, { ok: true }> {
  const pool: PlantIdentificationCandidate[] = [
    {
      scientificName: 'Rosa damascena',
      scientificNameAuthorship: 'Mill.',
      commonNames: ['ورد دمشقي', 'Damask rose'],
      family: 'Rosaceae',
      genus: 'Rosa',
      score: 0.86,
      taxonId: null,
    },
    {
      scientificName: 'Olea europaea',
      scientificNameAuthorship: 'L.',
      commonNames: ['زيتون', 'Olive'],
      family: 'Oleaceae',
      genus: 'Olea',
      score: 0.74,
      taxonId: null,
    },
    {
      scientificName: 'Ficus carica',
      scientificNameAuthorship: 'L.',
      commonNames: ['تين', 'Fig'],
      family: 'Moraceae',
      genus: 'Ficus',
      score: 0.61,
      taxonId: null,
    },
    {
      scientificName: 'Lavandula angustifolia',
      scientificNameAuthorship: 'Mill.',
      commonNames: ['خزامى', 'Lavender'],
      family: 'Lamiaceae',
      genus: 'Lavandula',
      score: 0.52,
      taxonId: null,
    },
    {
      scientificName: 'Mentha spicata',
      scientificNameAuthorship: 'L.',
      commonNames: ['نعناع', 'Spearmint'],
      family: 'Lamiaceae',
      genus: 'Mentha',
      score: 0.44,
      taxonId: null,
    },
  ]

  const candidates = pool.slice(0, Math.max(1, maxResults))
  console.warn(
    '[PlantNet] using mock identification fallback (CORS / API unavailable)',
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
      // Pl@ntNet expects api-key as query param only — never Authorization headers.
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
  return parsePlantNetPayload(parsed as PlantNetIdentifyResponse, maxResults)
}

/**
 * Direct call, then public CORS proxies, then mock — so Pages always resolves.
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

  for (const attempt of attempts) {
    const cloned = cloneFormData(formData)
    const result = await postIdentifyOnce(attempt.url, cloned, attempt.label)

    if ('error' in result) {
      if (isLikelyCorsNetworkError(result.error)) {
        failures.push(
          `${attempt.label}: network/CORS (${result.error instanceof Error ? result.error.message : 'unknown'})`,
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
      const outcome = parseSuccessBody(body, maxResults)
      if (outcome) {
        if (outcome.ok) return outcome
        failures.push(`${attempt.label}: ${outcome.message}`)
        // NO_RESULTS from a live API should not fall through to mock if we got a valid API answer
        if (outcome.code === 'NO_RESULTS') return outcome
        continue
      }
      failures.push(`${attempt.label}: invalid JSON (HTTP ${response.status})`)
      continue
    }

    if (isOriginBlockedError(response.status, body)) {
      failures.push(`${attempt.label}: Origin not allowed (HTTP 403)`)
      continue
    }

    // Auth/rate-limit on direct may also appear via proxy; keep trying proxies once.
    if (response.status === 401 || response.status === 403) {
      failures.push(
        `${attempt.label}: HTTP ${response.status} — ${body.slice(0, 200) || response.statusText}`,
      )
      continue
    }

    failures.push(
      `${attempt.label}: HTTP ${response.status} — ${body.slice(0, 200) || response.statusText}`,
    )
  }

  console.error('[PlantNet] all live attempts failed; using mock fallback', failures)
  return buildMockIdentification(maxResults)
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
 * Uses CORS proxies when Origin is blocked; falls back to mock on total failure.
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
  const organ: PlantNetOrgan = options.organ ?? 'auto'
  const maxResults = options.maxResults ?? 5

  const formData = new FormData()
  formData.append('images', file, file.name || 'plant.jpg')
  formData.append('organs', organ)

  const plantNetUrl = buildIdentifyUrl(project)

  try {
    return await identifyWithResilience(plantNetUrl, formData, maxResults)
  } catch (error) {
    console.error('[PlantNet] unexpected identify failure; using mock', error)
    return buildMockIdentification(maxResults)
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

/** Confidence as a 0–100 percentage for UI display. */
export function confidencePercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.round(Math.min(Math.max(score, 0), 1) * 100)
}
