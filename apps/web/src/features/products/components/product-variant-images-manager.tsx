import { api } from '@cetus/api-client'
import type { ProductImage } from '@cetus/api-client/types/products'
import { generateImageName, getImageUrl } from '@cetus/shared/utils/image'
import { Button } from '@cetus/ui/button'
import { Field, FieldDescription, FieldLabel } from '@cetus/ui/field'
import { Sortable, SortableItem, SortableItemHandle } from '@cetus/ui/sortable'
import {
  type FileWithPreview,
  useFileUpload,
} from '@cetus/web/hooks/use-file-upload'
import { Image } from '@unpic/react'
import {
  AlertCircleIcon,
  GripVerticalIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { useImperativeHandle, useState } from 'react'

const formatBytes = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes'
  }
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

export type ProductVariantImagesManagerHandle = {
  process: () => Promise<void>
}

type ManagerImage = ProductImage & {
  isNew: boolean
  preview?: string
  fileId?: string
}

type Props = {
  initialImages?: ProductImage[]
  ref?: React.Ref<ProductVariantImagesManagerHandle>
  variantId: number
}

export function ProductVariantImagesManager({
  initialImages,
  ref,
  variantId,
}: Readonly<Props>) {
  const maxSize = 5_242_880 // 5MB
  const maxFiles = 5

  const [allImages, setAllImages] = useState<ManagerImage[]>(
    initialImages?.map((image) => ({
      ...image,
      imageUrl: getImageUrl(image.imageUrl || 'placeholder.svg'),
      isNew: false,
    })) || [],
  )

  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([])
  const [hasImagesChanged, setHasImagesChanged] = useState(false)

  const handleAddFiles = (newFiles: FileWithPreview[]) => {
    const currentImages = [...allImages]
    const maxPosition = Math.max(...currentImages.map((i) => i.sortOrder), -1)

    if (currentImages.length === maxFiles) {
      return
    }

    const newImages = newFiles.map(
      (file, index) =>
        ({
          id: index + maxPosition + 1,
          imageUrl: generateImageName(),
          preview: file.preview,
          sortOrder: index + maxPosition + 1,
          isNew: true,
          fileId: file.id,
        }) satisfies ManagerImage,
    )

    setAllImages((prev) => [...prev, ...newImages])
  }

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
      removeFile,
    },
  ] = useFileUpload({
    accept: 'image/svg+xml,image/png,image/jpeg,image/jpg,image/gif',
    initialFiles: allImages.map((img) => ({
      id: img.id.toString(),
      name: img.imageUrl,
      url: getImageUrl(img.imageUrl),
      size: 0,
      type: 'image/jpeg',
    })),
    maxSize,
    multiple: true,
    maxFiles,
    onFilesAdded: handleAddFiles,
  })

  const handleDeleteImage = (imageId: number) => {
    const filtered = allImages.filter((image) => image.id !== imageId)
    const reordered = filtered.map((img, index) => ({
      ...img,
      sortOrder: index,
    }))

    setAllImages(reordered)
    setHasImagesChanged(true)

    const deletedImage = allImages.find((image) => image.id === imageId)

    if (!deletedImage) {
      return
    }

    removeFile(deletedImage.fileId ?? deletedImage.id.toString())

    if (!deletedImage.isNew) {
      setDeletedImageIds((prev) => [...prev, Number(imageId)])
    }
  }

  const handleImagesOrderChange = (newImagesIds: number[]) => {
    setHasImagesChanged(true)

    const newImages = newImagesIds
      .map((id, index) => {
        const existingImage = allImages.find((image) => image.id === id)
        if (existingImage) {
          return {
            ...existingImage,
            sortOrder: index,
          } satisfies ProductImage
        }
        return null
      })
      .filter((image) => image !== null)

    setAllImages(newImages)
  }

  useImperativeHandle(ref, () => ({
    process: async () => {
      const pendingImages = allImages.filter((image) => image.isNew)

      if (pendingImages.length > 0) {
        const filestoUpload = pendingImages
          .map(async (img) => {
            const fileToUpload = files.find((file) => file.id === img.fileId)

            if (!fileToUpload) {
              return null
            }

            if (fileToUpload.file instanceof File) {
              const { url } = await api.aws.generateSignedUrl({
                fileName: img.imageUrl,
              })

              const response = await fetch(url, {
                method: 'PUT',
                body: fileToUpload.file,
              })

              return response
            }

            return null
          })
          .filter(Boolean)

        await Promise.all(filestoUpload)

        const response = await api.products.variants.images.add(variantId, {
          id: variantId,
          images: pendingImages.map((img) => ({
            ...img,
            id: img.id.toString(),
          })),
        })

        for (const img of pendingImages) {
          const savedImage = response.images.find(
            (image) => image.imageUrl === img.imageUrl,
          )

          img.id = savedImage?.id ?? img.id
          img.isNew = false
        }
      }

      if (deletedImageIds.length > 0) {
        const imagesToDelete = deletedImageIds.map((imageId) =>
          api.products.variants.images.delete(variantId, imageId),
        )

        await Promise.all(imagesToDelete)
        setDeletedImageIds([])
      }

      if (hasImagesChanged) {
        await api.products.variants.images.order({
          variantId,
          images: allImages,
        })

        setHasImagesChanged(false)
      }
    },
  }))

  return (
    <Field>
      <FieldLabel className="flex items-center">Imágenes</FieldLabel>
      <FieldDescription>
        Sube hasta 5 imágenes de hasta 5MB cada una
      </FieldDescription>

      <Sortable
        className="flex flex-wrap gap-2.5"
        getItemValue={(item) => item.toString()}
        onValueChange={handleImagesOrderChange}
        strategy="grid"
        value={allImages.map((img) => img.id)}
      >
        {allImages.map((img) => (
          <SortableItem key={img.id} value={img.id.toString()}>
            <div className="group relative flex shrink-0 items-center justify-center rounded-md border border-border bg-accent/50 shadow-none transition-all duration-200 hover:z-10 hover:bg-accent/70 data-[dragging=true]:z-50">
              <Image
                alt={img.altText}
                className="pointer-events-none h-[120px] rounded-md object-cover"
                height={120}
                key={img.id}
                layout="fixed"
                src={img.preview ?? img.imageUrl}
                width={120}
              />

              <SortableItemHandle className="absolute start-2 top-2 cursor-grab opacity-0 active:cursor-grabbing group-hover:opacity-100">
                <Button
                  className="size-6 rounded-full"
                  size="icon"
                  variant="outline"
                >
                  <GripVerticalIcon className="size-3.5" />
                </Button>
              </SortableItemHandle>

              <Button
                className="absolute end-2 top-2 size-6 rounded-full opacity-0 shadow-sm group-hover:opacity-100"
                onClick={() => handleDeleteImage(img.id)}
                size="icon"
                variant="outline"
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          </SortableItem>
        ))}
      </Sortable>

      <div className="flex flex-col gap-2">
        {/** biome-ignore lint/a11y/noNoninteractiveElementInteractions: is a draggable element */}
        {/** biome-ignore lint/a11y/noStaticElementInteractions: is a draggable element */}
        <div
          className="relative flex min-h-52 flex-col items-center not-data-[files]:justify-center overflow-hidden rounded-md border border-input border-dashed p-4 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
          data-dragging={isDragging || undefined}
          data-files={files.length > 0 || undefined}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            {...getInputProps()}
            aria-label="Upload image file"
            className="sr-only"
          />
          <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
            <div
              aria-hidden="true"
              className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
            >
              <ImageIcon className="size-4 opacity-60" />
            </div>
            <p className="mb-1.5 font-medium text-sm">
              Arrastra y suelta tus imágenes aquí
            </p>
            <p className="text-muted-foreground text-xs">
              SVG, PNG, JPG o GIF (máx. {formatBytes(maxSize)})
            </p>
            <Button
              className="mt-4"
              onClick={openFileDialog}
              type="button"
              variant="outline"
            >
              <UploadIcon aria-hidden="true" className="-ms-1 opacity-60" />
              Seleccionar imágenes
            </Button>
          </div>
        </div>

        {errors.length > 0 && (
          <div
            className="flex items-center gap-1 text-destructive text-xs"
            role="alert"
          >
            <AlertCircleIcon className="size-3 shrink-0" />
            <span>{errors[0]}</span>
          </div>
        )}
      </div>
    </Field>
  )
}
