import { plants } from '@/data/plants'
import type { Plant, PlantFilters } from '@/types/plant'

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export function getAllPlants(): Plant[] {
  return plants
}

export function getPlantById(id: string): Plant | undefined {
  return plants.find((plant) => plant.id === id)
}

export function getPopularPlants(limit = 6): Plant[] {
  return plants.filter((plant) => plant.popular).slice(0, limit)
}

export function searchPlants(filters: PlantFilters): Plant[] {
  const query = normalize(filters.query)

  return plants.filter((plant) => {
    const matchesQuery =
      !query ||
      normalize(plant.arabicName).includes(query) ||
      normalize(plant.scientificName).includes(query) ||
      normalize(plant.family).includes(query) ||
      normalize(plant.category).includes(query)

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

    return (
      matchesQuery &&
      matchesSoil &&
      matchesEnvironment &&
      matchesSunlight &&
      matchesDifficulty
    )
  })
}
