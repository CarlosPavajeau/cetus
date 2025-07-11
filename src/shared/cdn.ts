export const getImageUrl = (image: string, format?: string) => {
  const cdnUrl = import.meta.env.VITE_CDN_URL

  return `${cdnUrl}/${image}${format ? `.${format}` : ''}`
}
