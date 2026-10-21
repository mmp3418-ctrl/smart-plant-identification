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
  /** Confidence score in [0, 1] derived from Gemini `health_status` when possible */
  score: number
  /** Exact confidence percentage 0–100 derived from `score` */
  confidencePercent: number
  /** Optional external id (unused for Gemini) */
  taxonId: string | null
  /** Arabic care / plant description from Gemini */
  description: string | null
  /** Raw health / certainty text from Gemini */
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
  scientificName: string
  commonNames: string[]
  commonArabicNames: string[]
  family: string | null
  confidencePercent: number
  score: number
  description: string | null
  healthStatus: string | null
}

/** Structured plant JSON we ask Gemini to return. */
export interface GeminiPlantJson {
  common_name?: string
  scientific_name?: string
  description?: string
  health_status?: string
}
