const DIACRITICS = /[\u0300-\u036f]/g
const INVALID_CHARS = /[^a-z0-9\s-]/g
const WHITESPACE = /\s+/g
const EDGE_HYPHENS = /^-+|-+$/g
const MULTI_HYPHENS = /-{2,}/g

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(INVALID_CHARS, '')
    .trim()
    .replace(WHITESPACE, '-')
    .replace(EDGE_HYPHENS, '')
    .replace(MULTI_HYPHENS, '-')
}
