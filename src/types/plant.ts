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

/** CMS disease / pest entry attached to a plant record. */
export interface PlantDiseaseEntry {
  id: string
  name: string
  symptoms: string
  prevention: string
  treatment?: string
}

/**
 * Full plant guide record — CRUD-ready for Admin / future Supabase CMS.
 * Legacy field names (`arabicName`, `imageUrl`) remain for UI compatibility.
 */
export interface Plant {
  id: string
  /** Display title (falls back to common/arabic name in UI). */
  title: string
  /** Common name (Arabic preferred). */
  arabicName: string
  commonName: string
  scientificName: string
  family: string
  /** Classification bucket e.g. الداخلي، الخارجي، الصباريات */
  category: string
  classification: string
  description: string
  /** Cover / hero image */
  imageUrl: string
  coverImageUrl: string
  soilTypes: SoilType[]
  environments: EnvironmentType[]
  watering: WateringFrequency | string
  sunlight: SunlightLevel | string
  temperatureRange: string
  humidity: string
  careGuide: string[]
  warnings: string[]
  diseases: PlantDiseaseEntry[]
  tags: string[]
  /** Free-form CMS attributes (key → value). */
  attributes: Record<string, string>
  careDifficulty: CareDifficulty
  popular: boolean
  suitableRegions: string[]
  published: boolean
  createdAt: string
  updatedAt: string
}

/** Payload accepted when creating/updating via Admin CMS. */
export type PlantInput = Omit<Plant, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

export interface PlantFilters {
  query: string
  soilTypes: SoilType[]
  environments: EnvironmentType[]
  sunlight: SunlightLevel | null
  difficulty: CareDifficulty | null
  category: string | null
  tags: string[]
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

export const CATEGORY_OPTIONS = [
  'الداخلي',
  'الخارجي',
  'الصباريات',
  'أعشاب عطرية',
  'أشجار مثمرة',
  'نباتات زينة',
] as const

export const DEFAULT_FILTERS: PlantFilters = {
  query: '',
  soilTypes: [],
  environments: [],
  sunlight: null,
  difficulty: null,
  category: null,
  tags: [],
}

export function createEmptyPlantInput(): PlantInput {
  return {
    title: '',
    arabicName: '',
    commonName: '',
    scientificName: '',
    family: '',
    category: 'الداخلي',
    classification: 'الداخلي',
    description: '',
    imageUrl: '',
    coverImageUrl: '',
    soilTypes: [],
    environments: [],
    watering: 'أسبوعياً',
    sunlight: 'شمس معتدلة',
    temperatureRange: '',
    humidity: '',
    careGuide: [],
    warnings: [],
    diseases: [],
    tags: [],
    attributes: {},
    careDifficulty: 'سهل',
    popular: false,
    suitableRegions: [],
    published: true,
  }
}

/** Normalize partial/legacy records into a full Plant shape. */
export function normalizePlantRecord(
  raw: Partial<Plant> & { id: string },
): Plant {
  const now = new Date().toISOString()
  const arabicName = (raw.arabicName || raw.commonName || raw.title || '').trim()
  const commonName = (raw.commonName || raw.arabicName || '').trim()
  const title = (raw.title || arabicName || commonName || 'نبات').trim()
  const imageUrl = (raw.coverImageUrl || raw.imageUrl || '').trim()
  const category = (raw.category || raw.classification || '').trim()

  return {
    id: raw.id,
    title,
    arabicName: arabicName || title,
    commonName: commonName || arabicName || title,
    scientificName: (raw.scientificName || '').trim(),
    family: (raw.family || '').trim(),
    category,
    classification: (raw.classification || category).trim(),
    description: (raw.description || '').trim(),
    imageUrl,
    coverImageUrl: (raw.coverImageUrl || imageUrl).trim(),
    soilTypes: Array.isArray(raw.soilTypes) ? raw.soilTypes : [],
    environments: Array.isArray(raw.environments) ? raw.environments : [],
    watering: raw.watering || 'حسب الحاجة',
    sunlight: raw.sunlight || 'شمس معتدلة',
    temperatureRange: (raw.temperatureRange || '').trim(),
    humidity: (raw.humidity || '').trim(),
    careGuide: Array.isArray(raw.careGuide) ? raw.careGuide : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    diseases: Array.isArray(raw.diseases) ? raw.diseases : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    attributes:
      raw.attributes && typeof raw.attributes === 'object' ? raw.attributes : {},
    careDifficulty: raw.careDifficulty || 'سهل',
    popular: Boolean(raw.popular),
    suitableRegions: Array.isArray(raw.suitableRegions)
      ? raw.suitableRegions
      : [],
    published: raw.published !== false,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  }
}
