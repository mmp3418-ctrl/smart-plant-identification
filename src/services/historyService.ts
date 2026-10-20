import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { ServiceError } from '@/services/errors'
import type { IdentificationRecord } from '@/types/plant'
import type { DbIdentificationHistoryRow } from '@/types/userData'

const MAX_PREVIEW_CHARS = 120_000

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new ServiceError(
      'قاعدة البيانات غير مُعدّة لحفظ سجل التعريف.',
      'MISSING_SUPABASE',
    )
  }
  return supabase
}

function mapRow(row: DbIdentificationHistoryRow): IdentificationRecord {
  return {
    id: row.id,
    plantId: row.plant_id ?? 'unknown',
    plantName: row.plant_name,
    scientificName: row.scientific_name,
    confidence: row.confidence,
    imagePreview: row.image_preview ?? undefined,
    createdAt: row.created_at,
  }
}

function sanitizePreview(preview: string | undefined): string | null {
  if (!preview) return null
  if (preview.length > MAX_PREVIEW_CHARS) return null
  return preview
}

export async function fetchIdentificationHistory(
  userId: string,
): Promise<IdentificationRecord[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('identification_history')
    .select(
      'id, user_id, plant_id, plant_name, scientific_name, confidence, image_preview, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.warn('[history] fetch:', error.message)
    throw new ServiceError('تعذّر تحميل سجل التعريف.', 'API_ERROR')
  }

  return ((data ?? []) as DbIdentificationHistoryRow[]).map(mapRow)
}

export async function insertIdentificationHistory(
  userId: string,
  record: Omit<IdentificationRecord, 'id' | 'createdAt'>,
): Promise<IdentificationRecord | null> {
  const client = requireClient()

  const { data, error } = await client
    .from('identification_history')
    .insert({
      user_id: userId,
      plant_id: record.plantId || null,
      plant_name: record.plantName,
      scientific_name: record.scientificName,
      confidence: record.confidence,
      image_preview: sanitizePreview(record.imagePreview),
    })
    .select(
      'id, user_id, plant_id, plant_name, scientific_name, confidence, image_preview, created_at',
    )
    .maybeSingle()

  if (error) {
    console.warn('[history] insert:', error.message)
    throw new ServiceError('تعذّر حفظ نتيجة التعريف في السجل.', 'API_ERROR')
  }

  if (!data) return null
  return mapRow(data as DbIdentificationHistoryRow)
}

export async function clearIdentificationHistory(
  userId: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('identification_history')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.warn('[history] clear:', error.message)
    throw new ServiceError('تعذّر مسح سجل التعريف.', 'API_ERROR')
  }
}
