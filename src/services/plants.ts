/**
 * @deprecated Prefer `usePlantCatalog()` from `@/context/PlantCatalogContext`.
 * These helpers only read the empty JSON seed — they do NOT see Admin CMS mutations.
 * Kept for rare non-React call sites; UI must use the catalog context.
 */
import { loadPersistedCatalog, loadSeedCatalog, filterPlants } from '@/services/plantCatalogStore'
import type { Plant, PlantFilters } from '@/types/plant'

function currentPlants(): Plant[] {
  return (loadPersistedCatalog() ?? loadSeedCatalog()).plants
}

export function getAllPlants(): Plant[] {
  return currentPlants()
}

export function getPlantById(id: string): Plant | undefined {
  return currentPlants().find((plant) => plant.id === id)
}

export function getPopularPlants(limit = 6): Plant[] {
  return currentPlants()
    .filter((plant) => plant.published !== false && plant.popular)
    .slice(0, limit)
}

export function searchPlants(filters: PlantFilters): Plant[] {
  return filterPlants(currentPlants(), filters)
}
