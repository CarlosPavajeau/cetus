import { env } from '@cetus/env/client'
import { v7 as uuid } from 'uuid'

/**
 * Builds a fully qualified CDN URL for an image asset.
 *
 * Concatenates the base CDN origin from `env.VITE_CDN_URL` with the provided image path.
 *
 * @remarks
 * - Automatically normalizes slashes: removes trailing slash from CDN URL and ensures leading slash on image path.
 * - Throws an error if `env.VITE_CDN_URL` is unset or empty, or if the image path is empty.
 *
 * @param image - The relative path or filename of the image within the CDN.
 * @returns The absolute URL of the image on the CDN.
 *
 * @example
 * // Given: env.VITE_CDN_URL = "https://cdn.example.com"
 * const url = getImageUrl("assets/logo.png");
 * // url === "https://cdn.example.com/assets/logo.png"
 */
export function getImageUrl(image: string) {
  const cdnUrl = env.VITE_CDN_URL

  if (!cdnUrl) {
    throw new Error('CDN_URL is not configured')
  }

  if (!image.trim()) {
    throw new Error('Image path cannot be empty')
  }

  const trimmedImage = image.trim()
  const normalizedCdn = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl
  const normalizedImage = trimmedImage.startsWith('/')
    ? trimmedImage
    : `/${trimmedImage}`

  return `${normalizedCdn}${normalizedImage}`
}

/**
 * Generates a unique image file name with a .webp extension.
 *
 * @returns A string containing a UUID-based file name with the .webp extension.
 *
 * @example
 * ```ts
 * const imageName = generateImageName();
 * // Returns: "01933d3e-c4a0-7000-8000-123456789abc.webp" (UUID v7 - time-ordered)
 * ```
 */
export function generateImageName() {
  return `${uuid()}.webp`
}
