export type SoilType =
  | 'طينية'
  | 'رملية'
  | 'طميية'
  | 'جيرية'
  | 'عضوية'
  | 'طينية رملية'

export type EnvironmentType =
  | 'داخلي'
  | 'خارجي'
  | 'صوبة'
  | 'ظل جزئي'
  | 'شمس معتدلة'
  | 'شمس كاملة'
  | 'رطوب عالي'

export type SunlightLevel = 'ظل كامل' | 'ظل جزئي' | 'شمس معتدلة' | 'شمس كاملة'

export type WateringFrequency =
  | 'نادراً'
  | 'أسبوعياً'
  | 'مرتين أسبوعياً'
  | 'يومياً'
  | 'حسب الحاجة'

export type CareDifficulty = 'سهل' | 'متوسط' | 'متقدم'

export interface Plant {
  id: string
  arabicName: string
  scientificName: string
  family: string
  category: string
  description: string
  imageUrl: string
  soilTypes: SoilType[]
  environments: EnvironmentType[]
  watering: WateringFrequency
  sunlight: SunlightLevel
  temperatureRange: string
  careGuide: string[]
  warnings: string[]
  careDifficulty: CareDifficulty
  popular: boolean
  suitableRegions: string[]
}

export interface PlantFilters {
  query: string
  soilTypes: SoilType[]
  environments: EnvironmentType[]
  sunlight: SunlightLevel | null
  difficulty: CareDifficulty | null
}

export interface IdentificationResult {
  plant: Plant
  confidence: number
  timestamp: string
  sourceImage?: string
}

export interface IdentificationRecord {
  id: string
  plantId: string
  plantName: string
  scientificName: string
  confidence: number
  imagePreview?: string
  createdAt: string
}

export const SOIL_OPTIONS: SoilType[] = [
  'طينية',
  'رملية',
  'طميية',
  'جيرية',
  'عضوية',
  'طينية رملية',
]

export const ENVIRONMENT_OPTIONS: EnvironmentType[] = [
  'داخلي',
  'خارجي',
  'صوبة',
  'ظل جزئي',
  'شمس معتدلة',
  'شمس كاملة',
  'رطوب عالي',
]

export const SUNLIGHT_OPTIONS: SunlightLevel[] = [
  'ظل كامل',
  'ظل جزئي',
  'شمس معتدلة',
  'شمس كاملة',
]

export const DIFFICULTY_OPTIONS: CareDifficulty[] = ['سهل', 'متوسط', 'متقدم']

export const DEFAULT_FILTERS: PlantFilters = {
  query: '',
  soilTypes: [],
  environments: [],
  sunlight: null,
  difficulty: null,
}
