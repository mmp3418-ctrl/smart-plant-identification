import type { PlantMatchResult } from '@/types/database'
import type { PlantIdentificationCandidate } from '@/types/plantnet'

/** Payload passed via React Router location.state after identification */
export interface IdentifySessionResult {
  previewUrl: string
  bestMatch: string | null
  candidates: PlantIdentificationCandidate[]
  identifiedAt: string
  match: PlantMatchResult
}
