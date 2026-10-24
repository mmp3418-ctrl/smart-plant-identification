import type { SiteContent } from '@/types/content'
import seed from '@/data/siteContent.json'

/** Typed seed loaded from JSON — swap/merge from CMS without touching UI. */
export const siteContent = seed as SiteContent
