/** Plant identification contracts (Google Gemini) */

export interface IdentifyImageOptions {
  /** Reserved for future multi-candidate prompts (Gemini returns one primary JSON). */
  maxResults?: number
}

export interface PlantIdentificationCandidate {
  /** Common name (Arabic preferred) */
  name: string
  scientificName: string
  scientificNameAuthorship: string | null
  /** @deprecated Prefer `name` — kept for matching / history helpers */
  commonNames: string[]
  family: string | null
  genus: string | null
  /** Confidence score in [0, 1] */
  score: number
  /** Exact confidence percentage 0–100 */
  confidencePercent: number
  taxonId: string | null
  description: string
  watering: string
  light: string
  temperature: string
  soil: string
  environment: string
  careGuide: string
  /** Optional free-text certainty note */
  healthStatus: string | null
}

export interface PlantIdentificationSuccess {
  ok: true
  bestMatch: string | null
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
    | 'UNKNOWN'
}

export type PlantIdentificationOutcome =
  | PlantIdentificationSuccess
  | PlantIdentificationFailure

/** Safe summary of the top match. */
export interface PlantIdentificationPrimarySummary {
  name: string
  scientificName: string
  commonNames: string[]
  commonArabicNames: string[]
  family: string | null
  confidencePercent: number
  score: number
  description: string
  watering: string
  light: string
  temperature: string
  soil: string
  environment: string
  careGuide: string
  healthStatus: string | null
}

/**
 * Structured plant JSON we ask Gemini to return.
 * Parser also accepts legacy / alternate key names.
 */
export interface GeminiPlantJson {
  name?: string
  scientificName?: string
  confidence?: number
  watering?: string
  light?: string
  temperature?: string
  description?: string
  soil?: string
  environment?: string
  careGuide?: string
  /** Legacy aliases */
  common_name?: string
  scientific_name?: string
  health_status?: string
}
