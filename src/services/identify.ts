/**
 * @deprecated Prefer `@/services/plantService` and `@/services/imageUtils`.
 */
export { fileToDataUrl } from '@/services/imageUtils'
export {
  identifyPlant,
  identifyPlantOrThrow,
  isPlantNetApiConfigured,
  validatePlantImage,
  displayPlantCommonName,
  confidencePercent,
  PLANTNET_UNRECOGNIZED_MESSAGE,
} from '@/services/plantService'
