/** Plant identification contracts (Google Gemini) */

export interface IdentifyImageOptions {
  /** Reserved for future multi-candidate prompts (Gemini returns one primary JSON). */
  maxResults?: number
}

export interface PlantIdentificationCandidate {
  scientificName: string
  scientificNameAuthorship: string | null
  commonNames: string[]
  family: string | null
  genus: string | null
  /** Confidence score in [0, 1] */
  score: number
  /** Exact confidence percentage 0–100 derived from `score` */
  confidencePercent: number
  taxonId: string | null
  /** Arabic plant / care description from Gemini */
  description: string | null
  /** Optional status / certainty text */
  healthStatus: string | null
  /** Care hints from Gemini (Arabic) */
  watering: string | null
  light: string | null
  temperature: string | null
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
  scientificName: string
  commonNames: string[]
  commonArabicNames: string[]
  family: string | null
  confidencePercent: number
  score: number
  description: string | null
  healthStatus: string | null
  watering: string | null
  light: string | null
  temperature: string | null
}

/**
 * Structured plant JSON we ask Gemini to return.
 * Also accepts legacy aliases during parsing for resilience.
 */
export interface GeminiPlantJson {
  name?: string
  scientificName?: string
  watering?: string
  light?: string
  temperature?: string
  description?: string
  /** Legacy aliases */
  common_name?: string
  scientific_name?: string
  health_status?: string
}
