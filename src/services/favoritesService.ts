import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { ServiceError } from '@/services/errors'
import type { DbFavoriteRow, FavoritePlantSummary } from '@/types/userData'

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new ServiceError(
      'قاعدة البيانات غير مُعدّة لحفظ المفضلة.',
      'MISSING_SUPABASE',
    )
  }
  return supabase
}

export async function fetchFavoritePlantIds(userId: string): Promise<string[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('favorites')
    .select('id, user_id, plant_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[favorites] fetch:', error.message)
    throw new ServiceError(
      'تعذّر تحميل المفضلة. حاول مرة أخرى.',
      'API_ERROR',
    )
  }

  const rows = (data ?? []) as DbFavoriteRow[]
  return rows.map((row) => row.plant_id)
}

export async function addFavorite(
  userId: string,
  plantId: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('favorites').upsert(
    {
      user_id: userId,
      plant_id: plantId,
    },
    { onConflict: 'user_id,plant_id' },
  )

  if (error) {
    console.warn('[favorites] add:', error.message)
    throw new ServiceError('تعذّر إضافة النبات إلى المفضلة.', 'API_ERROR')
  }
}

export async function removeFavorite(
  userId: string,
  plantId: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('plant_id', plantId)

  if (error) {
    console.warn('[favorites] remove:', error.message)
    throw new ServiceError('تعذّر إزالة النبات من المفضلة.', 'API_ERROR')
  }
}

/**
 * Resolve plant display data from Supabase `plants` for IDs missing locally.
 */
export async function fetchFavoritePlantSummaries(
  plantIds: string[],
): Promise<FavoritePlantSummary[]> {
  if (plantIds.length === 0) return []
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('plants')
    .select('id, arabic_name, scientific_name, image_url, description')
    .in('id', plantIds)

  if (error) {
    console.warn('[favorites] plant summaries:', error.message)
    return []
  }

  return (data ?? []).map((row) => {
    const record = row as {
      id: string
      arabic_name: string | null
      scientific_name: string
      image_url: string | null
      description: string | null
    }
    return {
      id: record.id,
      arabicName: record.arabic_name?.trim() || record.scientific_name,
      scientificName: record.scientific_name,
      imageUrl: record.image_url,
      description: record.description,
      source: 'supabase' as const,
    }
  })
}
