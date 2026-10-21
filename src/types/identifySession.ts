import type { PlantMatchResult } from '@/types/database'
import type {
  NormalizedPlantMatch,
  PlantIdentificationCandidate,
} from '@/types/identification'

/** Payload passed via React Router location.state after identification */
export interface IdentifySessionResult {
  previewUrl: string
  isPlant: boolean
  message: string | null
  bestMatch: string | null
  /** Canonical normalized top match from Pl@ntNet */
  primary: NormalizedPlantMatch | null
  candidates: PlantIdentificationCandidate[]
  identifiedAt: string
  match: PlantMatchResult
}
