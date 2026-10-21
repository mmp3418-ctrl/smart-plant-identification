import type { PlantMatchResult } from '@/types/database'
import type { PlantIdentificationCandidate } from '@/types/identification'

/** Payload passed via React Router location.state after identification */
export interface IdentifySessionResult {
  previewUrl: string
  /** Gemini plant detection flag */
  isPlant: boolean
  /** Arabic message when the image is not a plant */
  message: string | null
  bestMatch: string | null
  candidates: PlantIdentificationCandidate[]
  identifiedAt: string
  match: PlantMatchResult
}
