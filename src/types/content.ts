/**
 * CMS-ready content contracts.
 * UI pages render from these models so an Admin Dashboard / database
 * can later replace the static `siteContent` seed without rewriting views.
 */

export interface ContentLink {
  id: string
  label: string
  to: string
  end?: boolean
  /** Optional Lucide icon name for future admin mapping */
  icon?: string
}

export interface ContentBadge {
  id: string
  label: string
  variant?: 'brand' | 'sage' | 'warning' | 'default'
}

export interface HeroCta {
  id: string
  label: string
  to: string
  variant?: 'primary' | 'outline' | 'secondary'
  icon?: 'camera' | 'upload' | 'arrow'
}

export interface HeroContent {
  id: string
  badge?: ContentBadge
  title: string
  titleHighlight?: string
  subtitle: string
  ctas: HeroCta[]
  searchPlaceholder?: string
}

export interface FeatureCard {
  id: string
  title: string
  description: string
  accent?: 'amber' | 'gold' | 'slate'
}

export interface SectionHeader {
  id: string
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
}

export interface HomeContent {
  hero: HeroContent
  popularSection: SectionHeader
  features: FeatureCard[]
}

export interface AboutBlock {
  id: string
  title: string
  body?: string
  bullets?: string[]
  tone?: 'default' | 'warning'
}

export interface AboutContent {
  title: string
  intro: string
  blocks: AboutBlock[]
}

export interface FooterContent {
  brandName: string
  tagline: string
  linksTitle: string
  links: ContentLink[]
  disclaimerTitle: string
  disclaimer: string
  copyrightSuffix: string
  englishLine: string
}

export interface NavContent {
  brandName: string
  brandSubtitle: string
  links: ContentLink[]
  captureCta: string
}

export interface AuthCopy {
  loginTitle: string
  registerTitle: string
  loginSubtitle: string
  registerSubtitle: string
  localModeHint: string
  nameLabel: string
  namePlaceholder: string
  emailLabel: string
  emailPlaceholder: string
  passwordLabel: string
  passwordPlaceholder: string
  passwordHint: string
  loginSubmit: string
  registerSubmit: string
  loginTab: string
  registerTab: string
}

export interface IdentifyLoadingStep {
  id: string
  label: string
  durationMs: number
}

export interface IdentifyUiCopy {
  title: string
  subtitle: string
  analyzeHint: string
  dragHint: string
  dropHint: string
  tipLine: string
  analyzeButton: string
  resetButton: string
  retryButton: string
  loadingSteps: IdentifyLoadingStep[]
}

export interface SiteContent {
  version: number
  updatedAt: string
  nav: NavContent
  home: HomeContent
  about: AboutContent
  footer: FooterContent
  auth: AuthCopy
  identify: IdentifyUiCopy
}
