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
} from '@/types/identification'
import {
  extractBinomialScientificName,
  scientificNameQueryVariants,
} from '@/lib/scientificName'

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
 * Look up a plant by scientific name with fuzzy binomial cleansing.
 * Strips authorship (`Mill.`, `L.`, …) before querying so
 * `Rosa damascena Mill.` matches local `Rosa damascena`.
 */
export async function matchPlantByScientificName(
  scientificName: string,
): Promise<PlantMatchResult> {
  const client = requireSupabase()
  const variants = scientificNameQueryVariants(scientificName)
  const binomial = extractBinomialScientificName(scientificName)

  if (variants.length === 0) {
    return emptyMatch()
  }

  // 1) Exact ilike for each cleansed variant (binomial first)
  for (const variant of variants) {
    const exact = await client
      .from('plants')
      .select(PLANT_COLUMNS)
      .ilike('scientific_name', variant)
      .limit(1)
      .maybeSingle()

    if (exact.error) {
      console.warn(
        '[plantMatching] scientific_name lookup:',
        exact.error.message,
      )
      continue
    }

    if (exact.data) {
      return attachAssociations(exact.data as DbPlantRow, 'scientific_name')
    }
  }

  // 2) Prefix: binomial% (covers DB rows that still embed authorship)
  if (binomial) {
    const prefix = await client
      .from('plants')
      .select(PLANT_COLUMNS)
      .ilike('scientific_name', `${binomial}%`)
      .limit(1)
      .maybeSingle()

    if (!prefix.error && prefix.data) {
      return attachAssociations(prefix.data as DbPlantRow, 'scientific_name')
    }

    // 3) Contains match as last fuzzy step (real rows only — never invents)
    const contains = await client
      .from('plants')
      .select(PLANT_COLUMNS)
      .ilike('scientific_name', `%${binomial}%`)
      .limit(1)
      .maybeSingle()

    if (!contains.error && contains.data) {
      return attachAssociations(contains.data as DbPlantRow, 'scientific_name')
    }
  }

  return emptyMatch()
}

/**
 * Look up a plant by taxon_id when stored in the DB.
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
  commonNames?: string[]
  taxonId?: string | null
}

/**
 * Match Gemini names against local plants (scientific / Arabic / English names).
 * Never fabricates plant / soil / environment / care data.
 */
export async function matchPlantByCommonOrArabicName(
  name: string,
): Promise<PlantMatchResult> {
  const client = requireSupabase()
  // Strip PostgREST filter metacharacters from free-text labels
  const query = name
    .trim()
    .replace(/[%_,.()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!query) return emptyMatch()

  const { data, error } = await client
    .from('plants')
    .select(PLANT_COLUMNS)
    .or(
      `arabic_name.ilike.%${query}%,scientific_name.ilike.%${query}%,category.ilike.%${query}%`,
    )
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[plantMatching] common/arabic lookup:', error.message)
    return emptyMatch()
  }

  if (!data) return emptyMatch()
  return attachAssociations(data as DbPlantRow, 'scientific_name')
}

/**
 * Prefer taxon_id, then scientific binomial, then Gemini common-name labels.
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

  const scientific = input.scientificName?.trim() ?? ''
  if (scientific) {
    const byScientific = await matchPlantByScientificName(scientific)
    if (byScientific.plant) {
      return byScientific
    }

    const byLabel = await matchPlantByCommonOrArabicName(scientific)
    if (byLabel.plant) {
      return byLabel
    }
  }

  for (const common of input.commonNames ?? []) {
    const label = common?.trim()
    if (!label) continue
    const byCommon = await matchPlantByCommonOrArabicName(label)
    if (byCommon.plant) {
      return byCommon
    }
  }

  return emptyMatch()
}

export interface IdentifyAndMatchResult {
  identification: Extract<PlantIdentificationOutcome, { ok: true }>
  match: PlantMatchResult
}

/**
 * End-to-end: Gemini identify → Supabase environmental match for the top candidate.
 */
export async function identifyAndMatchPlant(
  file: File,
  options?: IdentifyImageOptions,
): Promise<IdentifyAndMatchResult> {
  const identification = await identifyPlantOrThrow(file, options)
  const top = identification.candidates?.[0]

  const match = await matchPlantFromIdentification({
    scientificName: top?.scientificName ?? identification.bestMatch ?? '',
    commonNames: top?.commonNames ?? [],
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
