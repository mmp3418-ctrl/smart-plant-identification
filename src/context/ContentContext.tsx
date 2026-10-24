import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { siteContent } from '@/content/siteContent'
import type { SiteContent } from '@/types/content'

interface ContentContextValue {
  content: SiteContent
  /** Merge/replace content from a future CMS / Admin API payload */
  setContent: (next: SiteContent) => void
  /** Deep-partial friendly updater for admin drafts */
  patchContent: (patch: Partial<SiteContent>) => void
  resetToSeed: () => void
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<SiteContent>(siteContent)

  const setContent = useCallback((next: SiteContent) => {
    setContentState(next)
  }, [])

  const patchContent = useCallback((patch: Partial<SiteContent>) => {
    setContentState((prev) => ({
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const resetToSeed = useCallback(() => {
    setContentState(siteContent)
  }, [])

  const value = useMemo(
    () => ({ content, setContent, patchContent, resetToSeed }),
    [content, setContent, patchContent, resetToSeed],
  )

  return (
    <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
  )
}

export function useSiteContent(): ContentContextValue {
  const ctx = useContext(ContentContext)
  if (!ctx) {
    throw new Error('useSiteContent يجب استخدامه داخل ContentProvider')
  }
  return ctx
}
