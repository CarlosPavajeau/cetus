export const getImageUrl = (image: string) => {
  const cdnUrl = import.meta.env.PUBLIC_CDN_URL

  return `${cdnUrl}/${image}`
}
