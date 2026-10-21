/** Pl@ntNet Identify API (v2) response shapes — strictly typed */

export interface PlantNetTaxonName {
  scientificNameWithoutAuthor: string
  scientificNameAuthorship?: string
  scientificName?: string
}

export interface PlantNetSpecies {
  scientificNameWithoutAuthor: string
  scientificNameAuthorship?: string
  scientificName?: string
  genus?: PlantNetTaxonName
  family?: PlantNetTaxonName
  commonNames?: string[]
}

export interface PlantNetGbif {
  id?: string | number
}

export interface PlantNetResult {
  score: number
  species: PlantNetSpecies
  gbif?: PlantNetGbif | null
}

export interface PlantNetIdentifyResponse {
  language?: string
  bestMatch?: string
  results?: PlantNetResult[]
  remainingIdentificationRequests?: number
}

export type PlantNetOrgan =
  | 'auto'
  | 'leaf'
  | 'flower'
  | 'fruit'
  | 'bark'
  | 'habit'
  | 'other'

export interface IdentifyImageOptions {
  /** Single plant organ hint for Pl@ntNet (default `auto`) */
  organ?: PlantNetOrgan
  /**
   * Optional multi-organ hints. When set, overrides `organ`.
   * For one image Pl@ntNet normally expects one organ; use sparingly.
   */
  organs?: PlantNetOrgan[]
  /** Pl@ntNet project / referential — default `all` */
  project?: string
  /** Max candidates to keep from the API response */
  maxResults?: number
}

export interface PlantIdentificationCandidate {
  scientificName: string
  scientificNameAuthorship: string | null
  commonNames: string[]
  family: string | null
  genus: string | null
  score: number
  /** GBIF taxon id when provided by Pl@ntNet */
  taxonId: string | null
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
