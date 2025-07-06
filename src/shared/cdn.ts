export const getImageUrl = (image: string) => {
  const cdnUrl = import.meta.env.VITE_CDN_URL

  return `${cdnUrl}/${image}`
}
