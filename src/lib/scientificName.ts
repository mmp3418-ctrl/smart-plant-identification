/**
 * Scientific-name cleansing for fuzzy Supabase matching.
 * Strips authorship, infra-ranks, and punctuation so we keep a clean binomial
 * (genus + species), e.g. `Rosa damascena Mill.` → `Rosa damascena`.
 */

const AUTHOR_STOP =
  /^(ex|et|al|fil|f|sensu|emend|ined|nom|nud|prov|hort)$/i

const RANK_MARKERS = new Set([
  'subsp',
  'subsp.',
  'ssp',
  'ssp.',
  'var',
  'var.',
  'f',
  'f.',
  'forma',
  'cv',
  'cv.',
  'subvar',
  'subvar.',
  'sect',
  'sect.',
  'ser',
  'ser.',
])

function looksLikeAuthorToken(token: string): boolean {
  const bare = token.replace(/[.,;]+$/g, '')
  if (!bare) return true

  // Classic abbreviations: L., Mill., Desf., Boiss., Willd., DC., Aiton
  if (/^[A-Z][A-Za-z]*\.$/.test(token)) return true
  if (/^[A-Z]{1,3}$/.test(bare)) return true
  if (AUTHOR_STOP.test(bare)) return true

  // Multi-part author surname starting with capital after binomial is complete
  if (/^[A-Z][a-z]+$/.test(bare) && bare.length <= 18) return true

  return false
}

/**
 * Normalize whitespace and strip parenthetical / bracket notes.
 */
export function normalizeScientificNameRaw(raw: string): string {
  return raw
    .replace(/\u00d7/g, '×')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract primary genus + species (binomial) from a Pl@ntNet / GBIF-style name.
 * Returns empty string when input is blank.
 */
export function extractBinomialScientificName(raw: string): string {
  const normalized = normalizeScientificNameRaw(raw)
  if (!normalized) return ''

  const tokens = normalized.split(' ').filter(Boolean)
  const binomial: string[] = []

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i] ?? ''
    const lower = token.toLowerCase()

    if (RANK_MARKERS.has(lower) || RANK_MARKERS.has(`${lower}.`)) {
      break
    }

    if (token === '×' || lower === 'x') {
      // Hybrid marker between epithets — keep if we already have genus
      if (binomial.length === 1) {
        binomial.push('×')
      }
      continue
    }

    if (binomial.length === 0) {
      // Genus: usually Capitalized Latin word
      const genus = token.replace(/[^A-Za-zÀ-ž-]/g, '')
      if (genus.length >= 2) {
        binomial.push(genus)
      }
      continue
    }

    if (binomial.length >= 1 && binomial.length < 3) {
      // After genus (+ optional ×), take species epithet then stop before authors
      if (looksLikeAuthorToken(token) && binomial.length >= 2) {
        break
      }
      if (looksLikeAuthorToken(token) && binomial.length === 1 && !/^[a-z]/.test(token)) {
        // Author immediately after genus with no species — abort extras
        break
      }

      const epithet = token.replace(/[^A-Za-zÀ-ž-]/g, '')
      if (!epithet) continue

      // Species epithets are typically lowercase; still accept if Latin-looking
      if (binomial[binomial.length - 1] === '×') {
        binomial.push(epithet)
        break
      }

      if (binomial.length === 1) {
        binomial.push(epithet)
        continue
      }

      // Already have genus + species — further tokens are authors / ranks
      break
    }
  }

  // Prefer exactly two words (genus + species); drop trailing × if incomplete
  const cleaned = binomial.filter((part, index, arr) => {
    if (part === '×' && index === arr.length - 1) return false
    return true
  })

  if (cleaned.length >= 2) {
    return `${cleaned[0]} ${cleaned[1]}`
  }

  return cleaned[0] ?? normalized
}

/**
 * Query variants for fuzzy DB lookup (most specific first).
 */
export function scientificNameQueryVariants(raw: string): string[] {
  const binomial = extractBinomialScientificName(raw)
  const normalized = normalizeScientificNameRaw(raw)
  const variants: string[] = []
  const seen = new Set<string>()

  for (const candidate of [binomial, normalized, raw.trim()]) {
    const value = candidate.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    variants.push(value)
  }

  return variants
}
