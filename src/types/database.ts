/** Supabase table row types for plant matching */

export interface DbPlantRow {
  id: string
  arabic_name: string | null
  scientific_name: string
  taxon_id: string | null
  family: string | null
  category: string | null
  description: string | null
  image_url: string | null
  watering: string | null
  sunlight: string | null
  temperature_range: string | null
  care_difficulty: string | null
  popular: boolean | null
  suitable_regions: string[] | null
  warnings: string[] | null
  created_at?: string | null
}

export interface DbSoilTypeRow {
  id: string
  name_ar: string
  name_en: string | null
  description: string | null
}

export interface DbEnvironmentRow {
  id: string
  name_ar: string
  name_en: string | null
  description: string | null
}

export interface DbCareGuideRow {
  id: string
  plant_id: string
  step_order: number | null
  instruction_ar: string
  instruction_en: string | null
}

export interface DbPlantSoilLink {
  plant_id: string
  soil_type_id: string
  soil_types: DbSoilTypeRow | DbSoilTypeRow[] | null
}

export interface DbPlantEnvironmentLink {
  plant_id: string
  environment_id: string
  environments: DbEnvironmentRow | DbEnvironmentRow[] | null
}

export type PlantMatchSource = 'scientific_name' | 'taxon_id'

export interface PlantMatchResult {
  plant: DbPlantRow | null
  soilTypes: DbSoilTypeRow[]
  environments: DbEnvironmentRow[]
  careGuides: DbCareGuideRow[]
  matchedBy: PlantMatchSource | null
}
