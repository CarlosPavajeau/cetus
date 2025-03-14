import { uploadFileToS3 } from '@/api/aws'
import { createProduct, updateProduct } from '@/api/products'
import type {
    CreateProductFormValues,
    UpdateProductFormValues,
} from '@/schemas/product'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

export function useCreateProduct(mainImage: File | null) {
  const navigate = useNavigate()

  return useMutation({
    mutationKey: ['products', 'create'],
    mutationFn: async (values: CreateProductFormValues) => {
      try {
        if (mainImage) {
          await uploadFileToS3({ fileName: values.imageUrl, file: mainImage })
        }
        return createProduct(values)
      } catch (error) {
        console.error('Failed to create product:', error)
        throw error
      }
    },
    onSuccess: () => {
      toast.success('Producto creado correctamente')
      navigate({ to: '/app/products' })
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`Error al crear el producto: ${errorMessage}`)
    },
  })
}

export function useUpdateProduct(
  mainImage: File | null,
  hasImageChanged: boolean,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['products', 'update'],
    mutationFn: async (values: UpdateProductFormValues) => {
      try {
        if (hasImageChanged && mainImage && values.imageUrl) {
          await uploadFileToS3({ fileName: values.imageUrl, file: mainImage })
        }

        return updateProduct({
          id: values.id,
          name: values.name,
          description: values.description,
          price: values.price,
          stock: values.stock,
          enabled: values.enabled,
          ...(hasImageChanged ? { imageUrl: values.imageUrl } : {}),
        })
      } catch (error) {
        console.error('Failed to update product:', error)
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

      if (onSuccess) {
        onSuccess()
      }
    },
  })
}
