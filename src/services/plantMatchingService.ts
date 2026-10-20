import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { ServiceError } from '@/services/errors'
import {
  identifyPlantOrThrow,
} from '@/services/plantIdentificationService'
import type {
  DbCareGuideRow,
  DbEnvironmentRow,
  DbPlantEnvironmentLink,
  DbPlantRow,
  DbPlantSoilLink,
  DbSoilTypeRow,
  PlantMatchResult,
  PlantMatchSource,
} from '@/types/database'
import type {
  IdentifyImageOptions,
  PlantIdentificationOutcome,
} from '@/types/plantnet'

const PLANT_COLUMNS =
  'id, arabic_name, scientific_name, taxon_id, family, category, description, image_url, watering, sunlight, temperature_range, care_difficulty, popular, suitable_regions, warnings, created_at' as const

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new ServiceError(
      'خدمة قاعدة البيانات غير مُعدّة. تحقق من مفاتيح Supabase في ملف البيئة.',
      'MISSING_SUPABASE',
    )
  }
  return supabase
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function normalizeScientificName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Fetch care guide steps for a plant. Returns [] when none exist — never invents steps.
 */
export async function fetchCareGuidesForPlant(
  plantId: string,
): Promise<DbCareGuideRow[]> {
  const client = requireSupabase()

  const { data, error } = await client
    .from('care_guides')
    .select('id, plant_id, step_order, instruction_ar, instruction_en')
    .eq('plant_id', plantId)
    .order('step_order', { ascending: true })

  if (error) {
    console.warn('[plantMatching] care_guides:', error.message)
    return []
  }

  return (data ?? []) as DbCareGuideRow[]
}

/**
 * Soil types via junction `plant_soil_types`, then fallback `soil_types.plant_id`.
 * Returns [] when nothing is linked.
 */
export async function fetchSoilTypesForPlant(
  plantId: string,
): Promise<DbSoilTypeRow[]> {
  const client = requireSupabase()

  const { data, error } = await client
    .from('plant_soil_types')
    .select(
      'plant_id, soil_type_id, soil_types ( id, name_ar, name_en, description )',
    )
    .eq('plant_id', plantId)

  if (!error && data) {
    const links = data as DbPlantSoilLink[]
    const fromJunction = links
      .map((link) => unwrapRelation(link.soil_types))
      .filter((row): row is DbSoilTypeRow => row !== null)
    if (fromJunction.length > 0) {
      return fromJunction
    }
  } else if (error) {
    console.warn('[plantMatching] plant_soil_types:', error.message)
  }

  // Fallback: direct plant_id on soil_types (if schema uses it)
  const { data: direct, error: directError } = await client
    .from('soil_types')
    .select('id, name_ar, name_en, description')
    .eq('plant_id', plantId)

  if (directError) {
    console.warn('[plantMatching] soil_types by plant_id:', directError.message)
    return []
  }

  return (direct ?? []) as DbSoilTypeRow[]
}

/**
 * Environments via junction `plant_environments`, then fallback `environments.plant_id`.
 * Returns [] when nothing is linked.
 */
export async function fetchEnvironmentsForPlant(
  plantId: string,
): Promise<DbEnvironmentRow[]> {
  const client = requireSupabase()

  const { data, error } = await client
    .from('plant_environments')
    .select(
      'plant_id, environment_id, environments ( id, name_ar, name_en, description )',
    )
    .eq('plant_id', plantId)

  if (!error && data) {
    const links = data as DbPlantEnvironmentLink[]
    const fromJunction = links
      .map((link) => unwrapRelation(link.environments))
      .filter((row): row is DbEnvironmentRow => row !== null)
    if (fromJunction.length > 0) {
      return fromJunction
    }
  } else if (error) {
    console.warn('[plantMatching] plant_environments:', error.message)
  }

  const { data: direct, error: directError } = await client
    .from('environments')
    .select('id, name_ar, name_en, description')
    .eq('plant_id', plantId)

  if (directError) {
    console.warn('[plantMatching] environments by plant_id:', directError.message)
    return []
  }

  return (direct ?? []) as DbEnvironmentRow[]
}

async function attachAssociations(
  plant: DbPlantRow,
  matchedBy: PlantMatchSource,
): Promise<PlantMatchResult> {
  const [careGuides, soilTypes, environments] = await Promise.all([
    fetchCareGuidesForPlant(plant.id),
    fetchSoilTypesForPlant(plant.id),
    fetchEnvironmentsForPlant(plant.id),
  ])

  return {
    plant,
    careGuides,
    soilTypes,
    environments,
    matchedBy,
  }
}

const emptyMatch = (): PlantMatchResult => ({
  plant: null,
  soilTypes: [],
  environments: [],
  careGuides: [],
  matchedBy: null,
})

/**
 * Look up a plant by scientific name (case-insensitive match on scientific_name).
 */
export async function matchPlantByScientificName(
  scientificName: string,
): Promise<PlantMatchResult> {
  const client = requireSupabase()
  const name = normalizeScientificName(scientificName)

  if (!name) {
    return emptyMatch()
  }

  // 1) Exact (case-insensitive)
  const exact = await client
    .from('plants')
    .select(PLANT_COLUMNS)
    .ilike('scientific_name', name)
    .limit(1)
    .maybeSingle()

  if (exact.error) {
    console.warn('[plantMatching] scientific_name lookup:', exact.error.message)
    return emptyMatch()
  }

  if (exact.data) {
    return attachAssociations(exact.data as DbPlantRow, 'scientific_name')
  }

  // 2) Prefix match only (e.g. "Olea europaea L." → "Olea europaea") — still real DB rows only
  const firstTwoWords = name.split(' ').slice(0, 2).join(' ')
  if (firstTwoWords && firstTwoWords !== name) {
    const prefix = await client
      .from('plants')
      .select(PLANT_COLUMNS)
      .ilike('scientific_name', `${firstTwoWords}%`)
      .limit(1)
      .maybeSingle()

    if (!prefix.error && prefix.data) {
      return attachAssociations(prefix.data as DbPlantRow, 'scientific_name')
    }
  }

  return emptyMatch()
}

/**
 * Look up a plant by taxon_id (e.g. GBIF id from Pl@ntNet).
 */
export async function matchPlantByTaxonId(
  taxonId: string,
): Promise<PlantMatchResult> {
  const client = requireSupabase()
  const id = taxonId.trim()

  if (!id) {
    return emptyMatch()
  }

  const { data, error } = await client
    .from('plants')
    .select(PLANT_COLUMNS)
    .eq('taxon_id', id)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[plantMatching] taxon_id lookup:', error.message)
    return emptyMatch()
  }

  if (!data) {
    return emptyMatch()
  }

  return attachAssociations(data as DbPlantRow, 'taxon_id')
}

export interface MatchFromIdentificationInput {
  scientificName: string
  taxonId?: string | null
}

/**
 * Prefer taxon_id match, then fall back to scientific name.
 * Never fabricates plant / soil / environment / care data.
 */
export async function matchPlantFromIdentification(
  input: MatchFromIdentificationInput,
): Promise<PlantMatchResult> {
  requireSupabase()

  if (input.taxonId?.trim()) {
    const byTaxon = await matchPlantByTaxonId(input.taxonId)
    if (byTaxon.plant) {
      return byTaxon
    }
  }

  if (input.scientificName.trim()) {
    return matchPlantByScientificName(input.scientificName)
  }

  return emptyMatch()
}

export interface IdentifyAndMatchResult {
  identification: Extract<PlantIdentificationOutcome, { ok: true }>
  match: PlantMatchResult
}

/**
 * End-to-end: Pl@ntNet identify → Supabase environmental match for the top candidate.
 */
export async function identifyAndMatchPlant(
  file: File,
  options?: IdentifyImageOptions,
): Promise<IdentifyAndMatchResult> {
  const identification = await identifyPlantOrThrow(file, options)
  const top = identification.candidates[0]

  const match = await matchPlantFromIdentification({
    scientificName: top?.scientificName ?? identification.bestMatch ?? '',
    taxonId: top?.taxonId ?? null,
  })

  return { identification, match }
}

/**
 * List all soil type catalog rows. Empty if unavailable.
 */
export async function listSoilTypes(): Promise<DbSoilTypeRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('soil_types')
    .select('id, name_ar, name_en, description')
    .order('name_ar', { ascending: true })

  if (error) {
    console.warn('[plantMatching] list soil_types:', error.message)
    return []
  }

  return (data ?? []) as DbSoilTypeRow[]
}

/**
 * List all environment catalog rows. Empty if unavailable.
 */
export async function listEnvironments(): Promise<DbEnvironmentRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('environments')
    .select('id, name_ar, name_en, description')
    .order('name_ar', { ascending: true })

  if (error) {
    console.warn('[plantMatching] list environments:', error.message)
    return []
  }

  return (data ?? []) as DbEnvironmentRow[]
}
