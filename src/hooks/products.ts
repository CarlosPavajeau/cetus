import { uploadFileToS3 } from '@/api/aws'
import {
  fetchProductBySlug,
  fetchProducts,
  fetchProductsForSale,
  fetchTopSellingProducts,
  updateProduct,
} from '@/api/products'
import type { FileWithPreview } from '@/hooks/use-file-upload'
import type { UpdateProduct } from '@/schemas/product'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import consola from 'consola'
import { toast } from 'sonner'

export function useUpdateProduct(images: FileWithPreview[]) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['products', 'update'],
    mutationFn: async (values: UpdateProduct) => {
      try {
        const filesToUpload = values.images
          .map((image) => {
            const file = images.find((img) => img.id === image.id)

            if (!file) {
              return null
            }

            if (file.file instanceof File) {
              return uploadFileToS3({
                fileName: image.imageUrl,
                file: file.file,
              })
            }

            return null
          })
          .filter((upload) => upload !== null)

        await Promise.all(filesToUpload)

        return updateProduct(values)
      } catch (error) {
        consola.error('Failed to update product:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido'
        toast.error(`Error al actualizar el producto: ${errorMessage}`)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['products'],
      })
      toast.success('Producto actualizado correctamente')
    },
  })
}

export function useProductsForSale() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'for-sale'],
    queryFn: () => fetchProductsForSale(),
  })

  return {
    products: data,
    isLoading,
    error,
  }
}

export function useProducts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    refetchOnMount: false,
  })

  return {
    products: data,
    isLoading,
    error,
  }
}

export function useTopSellingProducts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'top-selling'],
    queryFn: () => fetchTopSellingProducts(),
  })

  return {
    products: data,
    isLoading,
    error,
  }
}

export function useProductBySlug(slug: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'slug', slug],
    queryFn: () => fetchProductBySlug(slug),
  })

  return {
    product: data,
    isLoading,
    error,
  }
}
