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
import { readJson, writeJson } from '@/services/storage'
import type { IdentificationRecord } from '@/types/plant'

interface AppDataContextValue {
  favorites: string[]
  history: IdentificationRecord[]
  toggleFavorite: (plantId: string) => void
  isFavorite: (plantId: string) => boolean
  addHistory: (record: Omit<IdentificationRecord, 'id' | 'createdAt'>) => void
  clearHistory: () => void
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

  useEffect(() => {
    setFavorites(readJson<string[]>(favoritesKey(user?.id), []))
    setHistory(readJson<IdentificationRecord[]>(historyKey(user?.id), []))
  }, [user?.id])

  const toggleFavorite = useCallback(
    (plantId: string) => {
      setFavorites((prev) => {
        const next = prev.includes(plantId)
          ? prev.filter((id) => id !== plantId)
          : [...prev, plantId]
        writeJson(favoritesKey(user?.id), next)
        return next
      })
    },
    [user?.id],
  )

  const isFavorite = useCallback(
    (plantId: string) => favorites.includes(plantId),
    [favorites],
  )

  const addHistory = useCallback(
    (record: Omit<IdentificationRecord, 'id' | 'createdAt'>) => {
      setHistory((prev) => {
        const entry: IdentificationRecord = {
          ...record,
          id: `hist-${Date.now()}`,
          createdAt: new Date().toISOString(),
        }
        const next = [entry, ...prev].slice(0, 40)
        writeJson(historyKey(user?.id), next)
        return next
      })
    },
    [user?.id],
  )

  const clearHistory = useCallback(() => {
    writeJson(historyKey(user?.id), [])
    setHistory([])
  }, [user?.id])

  const value = useMemo(
    () => ({
      favorites,
      history,
      toggleFavorite,
      isFavorite,
      addHistory,
      clearHistory,
    }),
    [favorites, history, toggleFavorite, isFavorite, addHistory, clearHistory],
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
