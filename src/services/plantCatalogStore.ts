import seed from '@/data/plantsCatalog.json'
import { readJson, writeJson } from '@/services/storage'
import {
  normalizePlantRecord,
  type Plant,
  type PlantFilters,
  type PlantInput,
} from '@/types/plant'

const STORAGE_KEY = 'spi.plantCatalog.v1'

export interface PlantCatalogDocument {
  version: number
  updatedAt: string | null
  plants: Plant[]
}

function normalizeDoc(raw: unknown): PlantCatalogDocument {
  if (!raw || typeof raw !== 'object') {
    return { version: 1, updatedAt: null, plants: [] }
  }
  const record = raw as Partial<PlantCatalogDocument>
  const plants = Array.isArray(record.plants)
    ? record.plants
        .filter((p): p is Plant => Boolean(p && typeof p === 'object' && 'id' in p))
        .map((p) => normalizePlantRecord(p))
    : []
  return {
    version: typeof record.version === 'number' ? record.version : 1,
    updatedAt: record.updatedAt ?? null,
    plants,
  }
}

export function loadSeedCatalog(): PlantCatalogDocument {
  return normalizeDoc(seed)
}

export function loadPersistedCatalog(): PlantCatalogDocument | null {
  try {
    const stored = readJson<PlantCatalogDocument | null>(STORAGE_KEY, null)
    if (!stored) return null
    return normalizeDoc(stored)
  } catch {
    return null
  }
}

export function persistCatalog(doc: PlantCatalogDocument): void {
  writeJson(STORAGE_KEY, doc)
}

export function createCatalogDocument(plants: Plant[]): PlantCatalogDocument {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    plants: plants.map((p) => normalizePlantRecord(p)),
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export function filterPlants(
  plants: Plant[],
  filters: PlantFilters,
): Plant[] {
  const query = normalize(filters.query)

  return plants.filter((plant) => {
    if (plant.published === false) return false

    const haystack = [
      plant.title,
      plant.arabicName,
      plant.commonName,
      plant.scientificName,
      plant.family,
      plant.category,
      plant.classification,
      ...plant.tags,
    ]
      .join(' ')
      .toLowerCase()

    const matchesQuery = !query || haystack.includes(query)

    const matchesSoil =
      filters.soilTypes.length === 0 ||
      filters.soilTypes.some((soil) => plant.soilTypes.includes(soil))

    const matchesEnvironment =
      filters.environments.length === 0 ||
      filters.environments.some((env) => plant.environments.includes(env))

    const matchesSunlight =
      !filters.sunlight || plant.sunlight === filters.sunlight

    const matchesDifficulty =
      !filters.difficulty || plant.careDifficulty === filters.difficulty

    const matchesCategory =
      !filters.category ||
      plant.category === filters.category ||
      plant.classification === filters.category

    const matchesTags =
      filters.tags.length === 0 ||
      filters.tags.every((tag) => plant.tags.includes(tag))

    return (
      matchesQuery &&
      matchesSoil &&
      matchesEnvironment &&
      matchesSunlight &&
      matchesDifficulty &&
      matchesCategory &&
      matchesTags
    )
  })
}

export function buildPlantFromInput(
  input: PlantInput,
  options?: { existingId?: string; createdAt?: string },
): Plant {
  const now = new Date().toISOString()
  const id =
    options?.existingId ||
    input.id ||
    `plant-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36)}`

  const cover = (input.coverImageUrl || input.imageUrl || '').trim()
  const common = (input.commonName || input.arabicName || input.title || '').trim()
  const title = (input.title || common).trim()

  return normalizePlantRecord({
    ...input,
    id,
    title,
    arabicName: (input.arabicName || common || title).trim(),
    commonName: common || title,
    imageUrl: cover,
    coverImageUrl: cover,
    classification: input.classification || input.category,
    createdAt: options?.createdAt || now,
    updatedAt: now,
  })
}
