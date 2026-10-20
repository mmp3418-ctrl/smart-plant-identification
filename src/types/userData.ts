import type { UserRole } from '@/types/auth'

export interface DbProfileRow {
  id: string
  full_name: string | null
  email: string | null
  role: UserRole | string | null
  avatar_url: string | null
  updated_at: string | null
  created_at?: string | null
}

export interface DbFavoriteRow {
  id: string
  user_id: string
  plant_id: string
  created_at: string
}

export interface DbIdentificationHistoryRow {
  id: string
  user_id: string
  plant_id: string | null
  plant_name: string
  scientific_name: string
  confidence: number
  image_preview: string | null
  created_at: string
}

/** Lightweight plant info for favorites when local catalog miss */
export interface FavoritePlantSummary {
  id: string
  arabicName: string
  scientificName: string
  imageUrl: string | null
  description: string | null
  source: 'local' | 'supabase'
}
