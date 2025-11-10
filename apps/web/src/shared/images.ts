import { v7 as uuid } from 'uuid'

export const generateImageUrl = () => {
  const fileId = uuid()

  const imageUrl = `${fileId}.webp`

  return imageUrl
}
