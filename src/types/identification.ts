/** Plant identification contracts (Pl@ntNet API v2 + enriched care/health) */

export interface IdentifyImageOptions {
  maxResults?: number
  organ?: 'auto' | 'leaf' | 'flower' | 'fruit' | 'bark'
}

/** Structured Arabic care guidelines derived for the identified species. */
export interface PlantCareInfo {
  overview: string
  watering: string
  wateringSchedule: string
  moistureNeeds: string
  light: string
  temperature: string
  humidity: string
  soil: string
  fertilizer: string
  propagation: string
}

/** Single disease / pest entry with organic + chemical treatments. */
export interface PlantDiseaseInfo {
  id: string
  name: string
  symptoms: string
  prevention: string
  /** Combined short treatment summary */
  treatment: string
  organicTreatment: string
  chemicalTreatment: string
  severity: 'low' | 'medium' | 'high'
}

export interface PlantHealthProfile {
  summary: string
  diseases: PlantDiseaseInfo[]
}

export interface NormalizedPlantMatch {
  commonName: string
  scientificName: string
  confidence: number
  family: string
  careInfo: PlantCareInfo
  health: PlantHealthProfile
}

export interface PlantIdentificationCandidate {
  name: string
  commonName: string
  scientificName: string
  scientificNameAuthorship: string | null
  commonNames: string[]
  family: string | null
  genus: string | null
  score: number
  confidencePercent: number
  taxonId: string | null
  description: string | null
  overview: string | null
  watering: string | null
  wateringSchedule: string | null
  moistureNeeds: string | null
  light: string | null
  temperature: string | null
  humidity: string | null
  soil: string | null
  fertilizer: string | null
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
  fertilizer: string | null
  isPlant: boolean
  message: string | null
}

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
