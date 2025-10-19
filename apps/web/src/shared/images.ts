import { v7 as uuid } from 'uuid'
import type { FileWithPreview } from '@/hooks/use-file-upload'

export const generateImageUrl = (file: FileWithPreview) => {
  const rawFile = file.file

  const fileId = uuid()
  const fileExtension = rawFile.name.split('.').pop()
  const fileName = `${fileId}.${fileExtension}`

  const imageUrl = fileExtension === 'png' ? fileName : `${fileId}.webp`

  return imageUrl
}
