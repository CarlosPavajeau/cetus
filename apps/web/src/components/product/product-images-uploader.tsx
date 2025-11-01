import { Image } from '@unpic/react'
import { AlertCircleIcon, ImageIcon, UploadIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  type FileMetadata,
  type FileWithPreview,
  useFileUpload,
} from '@/hooks/use-file-upload'

type Props = {
  initialFiles?: FileMetadata[]
  onFilesChange?: (files: FileWithPreview[]) => void
}

export function ProductImagesUploader({
  initialFiles,
  onFilesChange,
}: Readonly<Props>) {
  const maxSizeMB = 5
  const maxSize = maxSizeMB * 1024 * 1024 // 5MB default
  const maxFiles = 5

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: 'image/svg+xml,image/png,image/jpeg,image/jpg,image/gif',
    maxSize,
    multiple: true,
    maxFiles,
    initialFiles,
    onFilesChange,
  })

  return (
    <div className="flex flex-col gap-2">
      {/** biome-ignore lint/a11y/noStaticElementInteractions: it's a drop area */}
      {/** biome-ignore lint/nursery/noNoninteractiveElementInteractions: it's a drop area */}
      <div
        className="relative flex min-h-52 flex-col items-center not-data-[files]:justify-center overflow-hidden rounded-xl border border-input border-dashed p-4 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
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
        {files.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-medium text-sm">
                Imágenes ({files.length})
              </h3>
              <Button
                disabled={files.length >= maxFiles}
                onClick={openFileDialog}
                size="sm"
                type="button"
                variant="outline"
              >
                <UploadIcon
                  aria-hidden="true"
                  className="-ms-0.5 size-3.5 opacity-60"
                />
                Agregar más
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {files.map((file) => (
                <div
                  className="relative aspect-square size-30 rounded-md bg-accent"
                  key={file.id}
                >
                  <Image
                    alt={file.file.name}
                    className="size-full rounded-[inherit] object-cover"
                    layout="fullWidth"
                    src={file.preview ?? ''}
                  />
                  <Button
                    aria-label="Remove image"
                    className="-top-2 -right-2 absolute size-6 rounded-full border-2 border-background shadow-none focus-visible:border-background"
                    onClick={() => removeFile(file.id)}
                    size="icon"
                    type="button"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
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
              SVG, PNG, JPG o GIF (máx. {maxSizeMB}MB)
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
        )}
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
  )
}
