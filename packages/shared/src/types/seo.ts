export type SEOConfig = {
  title: string
  description: string
  keywords?: string
  canonicalUrl?: string
  noIndex?: boolean
  noFollow?: boolean
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: string
  ogUrl?: string
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  structuredData?: Record<string, unknown>[]
}
