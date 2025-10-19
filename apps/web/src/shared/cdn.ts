import { env } from '@cetus/env/client'

export const getImageUrl = (image: string) => {
  const cdnUrl = env.VITE_CDN_URL

  return `${cdnUrl}/${image}`
}
