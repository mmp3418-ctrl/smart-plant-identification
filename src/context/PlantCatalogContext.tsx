import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  buildPlantFromInput,
  createCatalogDocument,
  filterPlants,
  loadPersistedCatalog,
  loadSeedCatalog,
  persistCatalog,
  type PlantCatalogDocument,
} from '@/services/plantCatalogStore'
import type { Plant, PlantFilters, PlantInput } from '@/types/plant'

interface PlantCatalogContextValue {
  plants: Plant[]
  catalog: PlantCatalogDocument
  loading: boolean
  /** Replace entire catalog (e.g. CMS sync / import). */
  replaceCatalog: (plants: Plant[]) => void
  upsertPlant: (input: PlantInput) => Plant
  deletePlant: (id: string) => void
  getPlantById: (id: string) => Plant | undefined
  getPopularPlants: (limit?: number) => Plant[]
  searchPlants: (filters: PlantFilters) => Plant[]
  getCategories: () => string[]
  resetToSeed: () => void
}

const PlantCatalogContext = createContext<PlantCatalogContextValue | null>(null)

export function PlantCatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<PlantCatalogDocument>(() => {
    return loadPersistedCatalog() ?? loadSeedCatalog()
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Allow future async CMS fetch; seed/localStorage already sync-loaded.
    setLoading(false)
  }, [])

  useEffect(() => {
    persistCatalog(catalog)
  }, [catalog])

  const replaceCatalog = useCallback((plants: Plant[]) => {
    setCatalog(createCatalogDocument(plants))
  }, [])

  const upsertPlant = useCallback((input: PlantInput) => {
    let saved!: Plant
    setCatalog((prev) => {
      const existing = input.id
        ? prev.plants.find((p) => p.id === input.id)
        : undefined
      saved = buildPlantFromInput(input, {
        existingId: existing?.id,
        createdAt: existing?.createdAt,
      })
      const plants = existing
        ? prev.plants.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...prev.plants]
      return createCatalogDocument(plants)
    })
    return saved
  }, [])

  const deletePlant = useCallback((id: string) => {
    setCatalog((prev) =>
      createCatalogDocument(prev.plants.filter((p) => p.id !== id)),
    )
  }, [])

  const getPlantById = useCallback(
    (id: string) => catalog.plants.find((p) => p.id === id),
    [catalog.plants],
  )

  const getPopularPlants = useCallback(
    (limit = 6) =>
      catalog.plants.filter((p) => p.published !== false && p.popular).slice(0, limit),
    [catalog.plants],
  )

  const searchPlants = useCallback(
    (filters: PlantFilters) => filterPlants(catalog.plants, filters),
    [catalog.plants],
  )

  const getCategories = useCallback(() => {
    const set = new Set<string>()
    for (const plant of catalog.plants) {
      if (plant.category) set.add(plant.category)
      if (plant.classification) set.add(plant.classification)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ar'))
  }, [catalog.plants])

  const resetToSeed = useCallback(() => {
    setCatalog(loadSeedCatalog())
  }, [])

  const value = useMemo(
    () => ({
      plants: catalog.plants,
      catalog,
      loading,
      replaceCatalog,
      upsertPlant,
      deletePlant,
      getPlantById,
      getPopularPlants,
      searchPlants,
      getCategories,
      resetToSeed,
    }),
    [
      catalog,
      loading,
      replaceCatalog,
      upsertPlant,
      deletePlant,
      getPlantById,
      getPopularPlants,
      searchPlants,
      getCategories,
      resetToSeed,
    ],
  )

  return (
    <PlantCatalogContext.Provider value={value}>
      {children}
    </PlantCatalogContext.Provider>
  )
}

export function usePlantCatalog(): PlantCatalogContextValue {
  const ctx = useContext(PlantCatalogContext)
  if (!ctx) {
    throw new Error('usePlantCatalog يجب استخدامه داخل PlantCatalogProvider')
  }
  return ctx
}
