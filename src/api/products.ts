import { anonymousApi, api } from '@/api/client'
import type { CreateProduct, UpdateProduct } from '@/schemas/product'

export type ProductImage = {
  id: number
  imageUrl: string
  altText?: string
  sortOrder: number
}

export type Product = {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  images: ProductImage[]
  rating: number
  reviewsCount: number
  enabled: boolean
  category?: string
  categoryId: string
  createdAt: string
  updatedAt: string
}

export const fetchProducts = async () => {
  const response = await api.get<Product[]>('/products')

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

export type SimpleProductForSale = {
  id: string
  name: string
  slug: string
  imageUrl: string
  price: number
  rating: number
  reviewsCount: number
  categoryId: string
}

export const fetchProductsForSale = async () => {
  const response =
    await anonymousApi.get<SimpleProductForSale[]>('/products/for-sale')

  return response.data
}

export async function fetchFeaturedProducts() {
  const response =
    await anonymousApi.get<SimpleProductForSale[]>('/products/featured')

  return response.data
}

export async function fetchPopularProducts() {
  const response =
    await anonymousApi.get<SimpleProductForSale[]>('/products/popular')

  return response.data
}

export const createProduct = async (product: CreateProduct) => {
  const response = await api.post<Product>('/products', product)

  return response.data
}

export async function fetchProductSuggestions(productId: string) {
  const response = await anonymousApi.get<ProductForSale[]>(
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

export async function fetchTopSellingProducts() {
  const response = await api.get<TopSellingProduct[]>('/products/top-selling')

  return response.data
}

export async function fetchProductBySlug(slug: string) {
  const response = await anonymousApi.get<ProductForSale>(
    `/products/slug/${slug}`,
  )

  return response.data
}
