import { uploadFileToS3 } from '@/api/aws'
import {
  createProduct,
  fetchProduct,
  fetchProductBySlug,
  fetchProductSuggestions,
  fetchProducts,
  fetchProductsForSale,
  fetchTopSellingProducts,
  updateProduct,
} from '@/api/products'
import type { CreateProduct, UpdateProduct } from '@/schemas/product'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

export function useCreateProduct(mainImage: File | null, storeSlug?: string) {
  const navigate = useNavigate()

  return useMutation({
    mutationKey: ['products', 'create'],
    mutationFn: async (values: CreateProduct) => {
      try {
        if (mainImage) {
          await uploadFileToS3({ fileName: values.imageUrl, file: mainImage })
        }
        return createProduct(values, storeSlug)
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
    mutationFn: async (values: UpdateProduct) => {
      try {
        if (hasImageChanged && mainImage && values.imageUrl) {
          await uploadFileToS3({ fileName: values.imageUrl, file: mainImage })
        }

        return updateProduct({
          ...values,
          // If the image has not changed, we don't want to update the imageUrl
          // in the database, so we only include it if it has changed
          // and the imageUrl is not empty
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

export function useProduct(id: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
  })

  return {
    product: data,
    isLoading,
    error,
  }
}

export function useProductsForSale(storeSlug?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'for-sale', storeSlug],
    queryFn: () => fetchProductsForSale(storeSlug),
  })

  return {
    products: data,
    isLoading,
    error,
  }
}

export function useProducts(storeSlug?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', storeSlug],
    queryFn: () => fetchProducts(storeSlug),
    refetchOnMount: false,
  })

  return {
    products: data,
    isLoading,
    error,
  }
}

export function useProductSuggestions(productId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'suggestions', productId],
    queryFn: () => fetchProductSuggestions(productId!),
    enabled: Boolean(productId),
  })

  return {
    suggestions: data,
    isLoading,
    error,
  }
}

export function useTopSellingProducts(storeSlug?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'top-selling', storeSlug],
    queryFn: () => fetchTopSellingProducts(storeSlug),
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
