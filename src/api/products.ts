import { api } from '@/api/client'
import type { CreateProduct, UpdateProduct } from '@/schemas/product'

export type Product = {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  rating: number
  reviewsCount: number
  enabled: boolean
  category?: string
  categoryId: string
  createdAt: string
  updatedAt: string
}

export const fetchProducts = async (storeSlug?: string) => {
  const response = await api.get<Product[]>(
    `/products${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export const fetchProduct = async (id: string) => {
  const response = await api.get<Product>(`/products/${id}`)

  return response.data
}

export type ProductForSale = Omit<
  Product,
  'createdAt' | 'updatedAt' | 'enabled'
>

export const fetchProductsForSale = async (storeSlug?: string) => {
  const response = await api.get<ProductForSale[]>(
    `/products/for-sale${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export async function fetchFeaturedProducts(storeSlug?: string) {
  const response = await api.get<ProductForSale[]>(
    `/products/featured${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export async function fetchPopularProducts(storeSlug?: string) {
  const response = await api.get<ProductForSale[]>(
    `/products/popular${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export const createProduct = async (
  product: CreateProduct,
  storeSlug?: string,
) => {
  const response = await api.post<Product>(
    `/products${storeSlug ? `?store=${storeSlug}` : ''}`,
    product,
  )

  return response.data
}

export async function fetchProductSuggestions(productId: string) {
  const response = await api.get<ProductForSale[]>(
    `/products/suggestions?productId=${productId}`,
  )

  return response.data
}

export const updateProduct = async (product: UpdateProduct) => {
  const response = await api.put<Product>(`/products/${product.id}`, product)

  return response.data
}

export const deleteProduct = async (id: string) => {
  await api.delete(`/products/${id}`)
}

export type TopSellingProduct = {
  id: string
  name: string
  imageUrl?: string
  category?: string
  salesCount: number
}

export async function fetchTopSellingProducts(storeSlug?: string) {
  const response = await api.get<TopSellingProduct[]>(
    `/products/top-selling${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export async function fetchProductBySlug(slug: string) {
  const response = await api.get<ProductForSale>(`/products/slug/${slug}`)

  return response.data
}
