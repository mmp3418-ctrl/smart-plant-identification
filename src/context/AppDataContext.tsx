import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  addFavorite,
  fetchFavoritePlantIds,
  removeFavorite,
} from '@/services/favoritesService'
import {
  clearIdentificationHistory,
  fetchIdentificationHistory,
  insertIdentificationHistory,
} from '@/services/historyService'
import { isServiceError } from '@/services/errors'
import { readJson, writeJson } from '@/services/storage'
import type { IdentificationRecord } from '@/types/plant'

interface AppDataContextValue {
  favorites: string[]
  history: IdentificationRecord[]
  dataLoading: boolean
  dataError: string | null
  toggleFavorite: (plantId: string) => Promise<void>
  isFavorite: (plantId: string) => boolean
  addHistory: (
    record: Omit<IdentificationRecord, 'id' | 'createdAt'>,
  ) => Promise<void>
  clearHistory: () => Promise<void>
  refreshUserData: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

function favoritesKey(userId: string | undefined): string {
  return `spi.favorites.${userId ?? 'guest'}`
}

function historyKey(userId: string | undefined): string {
  return `spi.history.${userId ?? 'guest'}`
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<string[]>([])
  const [history, setHistory] = useState<IdentificationRecord[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  const refreshUserData = useCallback(async () => {
    setDataError(null)

    if (!user) {
      setFavorites(readJson<string[]>(favoritesKey(undefined), []))
      setHistory(readJson<IdentificationRecord[]>(historyKey(undefined), []))
      return
    }

    // Guest-like local fallback keys still used when Supabase is off
    if (!isSupabaseConfigured || user.id.startsWith('local-')) {
      setFavorites(readJson<string[]>(favoritesKey(user.id), []))
      setHistory(readJson<IdentificationRecord[]>(historyKey(user.id), []))
      return
    }

    setDataLoading(true)
    try {
      const [remoteFavorites, remoteHistory] = await Promise.all([
        fetchFavoritePlantIds(user.id),
        fetchIdentificationHistory(user.id),
      ])
      setFavorites(remoteFavorites)
      setHistory(remoteHistory)
      writeJson(favoritesKey(user.id), remoteFavorites)
      writeJson(historyKey(user.id), remoteHistory)
    } catch (error) {
      const message = isServiceError(error)
        ? error.message
        : 'تعذّر مزامنة بياناتك مع السحابة.'
      setDataError(message)
      // Fall back to cached local copies
      setFavorites(readJson<string[]>(favoritesKey(user.id), []))
      setHistory(readJson<IdentificationRecord[]>(historyKey(user.id), []))
    } finally {
      setDataLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshUserData()
  }, [refreshUserData])

  const isFavorite = useCallback(
    (plantId: string) => favorites.includes(plantId),
    [favorites],
  )

  const toggleFavorite = useCallback(
    async (plantId: string) => {
      const currentlyFavorite = favorites.includes(plantId)
      const next = currentlyFavorite
        ? favorites.filter((id) => id !== plantId)
        : [...favorites, plantId]

      // Optimistic UI
      setFavorites(next)
      writeJson(favoritesKey(user?.id), next)
      setDataError(null)

      if (user && isSupabaseConfigured && !user.id.startsWith('local-')) {
        try {
          if (currentlyFavorite) {
            await removeFavorite(user.id, plantId)
          } else {
            await addFavorite(user.id, plantId)
          }
        } catch (error) {
          // Revert
          setFavorites(favorites)
          writeJson(favoritesKey(user.id), favorites)
          setDataError(
            isServiceError(error)
              ? error.message
              : 'تعذّر تحديث المفضلة.',
          )
        }
      }
    },
    [favorites, user],
  )

  const addHistory = useCallback(
    async (record: Omit<IdentificationRecord, 'id' | 'createdAt'>) => {
      const localEntry: IdentificationRecord = {
        ...record,
        id: `hist-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }

      setHistory((prev) => {
        const next = [localEntry, ...prev].slice(0, 50)
        writeJson(historyKey(user?.id), next)
        return next
      })
      setDataError(null)

      if (user && isSupabaseConfigured && !user.id.startsWith('local-')) {
        try {
          const remote = await insertIdentificationHistory(user.id, record)
          if (remote) {
            setHistory((prev) => {
              const withoutTemp = prev.filter((item) => item.id !== localEntry.id)
              const next = [remote, ...withoutTemp].slice(0, 50)
              writeJson(historyKey(user.id), next)
              return next
            })
          }
        } catch (error) {
          setDataError(
            isServiceError(error)
              ? error.message
              : 'حُفظ السجل محلياً، لكن المزامنة السحابية فشلت.',
          )
        }
      }
    },
    [user],
  )

  const clearHistory = useCallback(async () => {
    setHistory([])
    writeJson(historyKey(user?.id), [])
    setDataError(null)

    if (user && isSupabaseConfigured && !user.id.startsWith('local-')) {
      try {
        await clearIdentificationHistory(user.id)
      } catch (error) {
        setDataError(
          isServiceError(error)
            ? error.message
            : 'تعذّر مسح السجل من السحابة.',
        )
        await refreshUserData()
      }
    }
  }, [user, refreshUserData])

  const value = useMemo(
    () => ({
      favorites,
      history,
      dataLoading,
      dataError,
      toggleFavorite,
      isFavorite,
      addHistory,
      clearHistory,
      refreshUserData,
    }),
    [
      favorites,
      history,
      dataLoading,
      dataError,
      toggleFavorite,
      isFavorite,
      addHistory,
      clearHistory,
      refreshUserData,
    ],
  )

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  )
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error('useAppData يجب استخدامه داخل AppDataProvider')
  }
  return context
}
