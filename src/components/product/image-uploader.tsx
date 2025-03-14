import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { cn } from '@/shared/cn'
import { UploadIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import type { Path, PathValue, useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'

export const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024

export type FormWithImageUrl = {
  imageUrl: string
}

export function useImageUpload<T extends FormWithImageUrl>(
  form: ReturnType<typeof useForm<T>>,
  initialImageUrl?: string,
) {
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [hasImageChanged, setHasImageChanged] = useState(false)

  const currentImageUrl = useMemo(() => initialImageUrl, [initialImageUrl])

  const mainImageUrl = useMemo(
    () => (mainImage ? URL.createObjectURL(mainImage) : currentImageUrl),
    [mainImage, currentImageUrl],
  )

  useEffect(() => {
    if (mainImage && mainImageUrl) {
      return () => URL.revokeObjectURL(mainImageUrl)
    }
  }, [mainImage, mainImageUrl])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        const fileName = uuid()

        setMainImage(file)
        form.setValue('imageUrl' as Path<T>, fileName as PathValue<T, Path<T>>)
        setHasImageChanged(true)
      }
    },
    [form],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    accept: ACCEPTED_FILE_TYPES,
  })

  const removeImage = useCallback(() => {
    setMainImage(null)
    form.setValue('imageUrl' as Path<T>, '' as PathValue<T, Path<T>>)
    setHasImageChanged(true)
  }, [form])

  return {
    mainImage,
    mainImageUrl,
    getRootProps,
    getInputProps,
    isDragActive,
    removeImage,
    hasImageChanged,
  }
}

export type ImageUploaderProps<T extends FormWithImageUrl> = {
  form: ReturnType<typeof useForm<T>>
  mainImage: File | null
  mainImageUrl: string | undefined
  getRootProps: ReturnType<typeof useDropzone>['getRootProps']
  getInputProps: ReturnType<typeof useDropzone>['getInputProps']
  isDragActive: boolean
  removeImage: () => void
  label?: string
}

export function ImageUploader<T extends FormWithImageUrl>({
  form,
  mainImage,
  mainImageUrl,
  getRootProps,
  getInputProps,
  isDragActive,
  removeImage,
  label = 'Imagen principal',
}: ImageUploaderProps<T>) {
  return (
    <div className="*:not-first:mt-2">
      <Label htmlFor="image">{label}</Label>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-muted-foreground/25 border-dashed px-6 py-8 text-center transition-colors hover:bg-accent/50',
          isDragActive && 'border-muted-foreground/50',
          mainImageUrl && 'border-0',
        )}
      >
        <input {...getInputProps()} />

        {mainImageUrl ? (
          <>
            <img
              src={mainImageUrl}
              alt="Preview"
              className="max-h-64 w-full object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation()
                removeImage()
              }}
            >
              <XIcon className="size-4" />
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center">
              <UploadIcon className="size-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">
                Arrastra y suelta o haz clic para seleccionar
              </p>
              <p className="text-muted-foreground text-xs">
                JPG, PNG, WEBP (max. 5MB)
              </p>
            </div>
          </div>
        )}
      </div>
      <FormMessage />
    </div>
  )
}
