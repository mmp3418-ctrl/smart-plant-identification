/** Plant identification contracts (Google Gemini 1.5 Flash) */

export interface IdentifyImageOptions {
  maxResults?: number
}

export interface PlantIdentificationCandidate {
  name: string
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
  light: string | null
  temperature: string | null
  soil: string | null
  environment: string | null
  careGuide: string | null
  healthStatus: string | null
}

export interface PlantIdentificationSuccess {
  ok: true
  /** Whether Gemini detected a plant / flower / tree / leaf in the image */
  isPlant: boolean
  /** Arabic message when `isPlant` is false */
  message: string | null
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
  isPlant: boolean
  message: string | null
}

/** Raw JSON shapes Gemini may return */
export interface GeminiPlantPositiveJson {
  isPlant: true
  name?: string
  scientificName?: string
  confidence?: number
  watering?: string
  light?: string
  temperature?: string
  description?: string
}

export interface GeminiPlantNegativeJson {
  isPlant: false
  message?: string
}

export type GeminiPlantJson = GeminiPlantPositiveJson | GeminiPlantNegativeJson
