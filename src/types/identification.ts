/** Plant identification contracts (Pl@ntNet API v2 + enriched care/health) */

export interface IdentifyImageOptions {
  /** Max suggestions to keep after ranking (default 5). */
  maxResults?: number
  /** Organ hint sent to Pl@ntNet (`auto` by default). */
  organ?: 'auto' | 'leaf' | 'flower' | 'fruit' | 'bark'
}

/** Structured Arabic care guidelines derived for the identified species. */
export interface PlantCareInfo {
  watering: string
  /** Precise schedule phrasing (e.g. every N days / when surface dry) */
  wateringSchedule: string
  light: string
  temperature: string
  humidity: string
  soil: string
  propagation: string
}

/** Single disease / health issue entry for the species profile. */
export interface PlantDiseaseInfo {
  id: string
  name: string
  symptoms: string
  prevention: string
  treatment: string
  severity: 'low' | 'medium' | 'high'
}

/** Aggregated health block shown on result pages. */
export interface PlantHealthProfile {
  summary: string
  diseases: PlantDiseaseInfo[]
}

/**
 * Application-wide normalized top match from Pl@ntNet.
 * This is the canonical shape consumed by UI / matching layers.
 */
export interface NormalizedPlantMatch {
  commonName: string
  scientificName: string
  /** Confidence percentage 0–100 */
  confidence: number
  family: string
  careInfo: PlantCareInfo
  health: PlantHealthProfile
}

export interface PlantIdentificationCandidate {
  /** Display / common name (Arabic preferred when available). */
  name: string
  /** Alias of `name` for NormalizedPlantMatch consumers */
  commonName: string
  scientificName: string
  scientificNameAuthorship: string | null
  commonNames: string[]
  family: string | null
  genus: string | null
  /** Confidence score in [0, 1] */
  score: number
  /** Exact confidence percentage 0–100 */
  confidencePercent: number
  taxonId: string | null
  description: string | null
  watering: string | null
  wateringSchedule: string | null
  light: string | null
  temperature: string | null
  humidity: string | null
  soil: string | null
  propagation: string | null
  environment: string | null
  careGuide: string | null
  careInfo: PlantCareInfo
  health: PlantHealthProfile
  healthStatus: string | null
  detailUrl: string | null
}

export interface PlantIdentificationSuccess {
  ok: true
  isPlant: boolean
  message: string | null
  bestMatch: string | null
  /** Top normalized match when identification succeeds */
  primary: NormalizedPlantMatch | null
  candidates: PlantIdentificationCandidate[]
  identifiedAt: string
}

export interface PlantIdentificationFailure {
  ok: false
  message: string
  code:
    | 'MISSING_API_KEY'
    | 'INVALID_FILE'
    | 'FILE_TOO_LARGE'
    | 'NETWORK'
    | 'API_ERROR'
    | 'NO_RESULTS'
    | 'LOW_CONFIDENCE'
    | 'UNKNOWN'
}

export type PlantIdentificationOutcome =
  | PlantIdentificationSuccess
  | PlantIdentificationFailure

export interface PlantIdentificationPrimarySummary {
  name: string
  scientificName: string
  commonNames: string[]
  commonArabicNames: string[]
  family: string | null
  confidencePercent: number
  score: number
  description: string | null
  watering: string | null
  light: string | null
  temperature: string | null
  soil: string | null
  humidity: string | null
  propagation: string | null
  isPlant: boolean
  message: string | null
}

// ─── Pl@ntNet raw API shapes ─────────────────────────────────────────────────

export interface PlantNetNamedTaxon {
  scientificNameWithoutAuthor?: string
  scientificNameAuthorship?: string
  scientificName?: string
}
export interface PlantNetSpecies {
  scientificNameWithoutAuthor?: string
  scientificNameAuthorship?: string
  scientificName?: string
  commonNames?: string[]
  family?: PlantNetNamedTaxon
  genus?: PlantNetNamedTaxon
}

export interface PlantNetResult {
  score?: number
  species?: PlantNetSpecies
}

export interface PlantNetIdentifyResponse {
  query?: unknown
  language?: string
  preferedReferential?: string
  bestMatch?: string
  results?: PlantNetResult[]
  remainingIdentificationRequests?: number
  version?: string
}
