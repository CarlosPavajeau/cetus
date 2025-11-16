import { env } from '@cetus/env/client'
import { v7 as uuid } from 'uuid'

/**
 * Builds a fully qualified CDN URL for an image asset.
 *
 * Concatenates the base CDN origin from `env.VITE_CDN_URL` with the provided image path.
 *
 * @remarks
 * - This function does not normalize leading/trailing slashes; avoid double slashes by ensuring
 *   either the base URL does not end with `/` or the `image` argument does not start with `/`.
 * - If `env.VITE_CDN_URL` is unset or empty, the returned URL may be malformed.
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

  return `${cdnUrl}/${image}`
}

/**
 * Generates a unique image file name with a .webp extension.
 *
 * @returns A string containing a UUID-based file name with the .webp extension.
 *
 * @example
 * ```ts
 * const imageName = generateImageName();
 * // Returns: "550e8400-e29b-41d4-a716-446655440000.webp"
 * ```
 */
export function generateImageName() {
  return `${uuid()}.webp`
}
