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

export type ProductOptionValue = {
  id: number
  value: string
  optionTypeId: number
  optionTypeName: string
}

export type ProductVariantResponse = {
  id: number
  sku: string
  price: number
  stock: number
  images: ProductImage[]
  optionValues: ProductOptionValue[]
}

export type ProductForSale = {
  id: string
  name: string
  slug: string
  description?: string
  rating: number
  reviewsCount: number
  categoryId: string
  category?: string
  categorySlug: string
  storeId: string

  variants: ProductVariantResponse[]
}

export type SimpleProductForSale = {
  id: string
  name: string
  slug: string
  imageUrl: string
  price: number
  rating: number
  reviewsCount: number
  categoryId: string
  variantId: number
}

export const fetchProductsForSale = async () => {
  const response =
    await anonymousApi.get<SimpleProductForSale[]>('/products/for-sale')

  return response.data
}

export async function fetchFeaturedProducts(store: string) {
  const response = await anonymousApi.get<SimpleProductForSale[]>(
    '/products/featured',
    {
      params: { store },
    },
  )

  return response.data
}

export async function fetchPopularProducts(store: string) {
  const response = await anonymousApi.get<SimpleProductForSale[]>(
    '/products/popular',
    {
      params: { store },
    },
  )

  return response.data
}

export async function fetchProductsByCategory(categoryId: string) {
  const response = await anonymousApi.get<SimpleProductForSale[]>(
    `/products/category/${categoryId}`,
  )

  return response.data
}

export const createProduct = async (product: CreateProduct) => {
  const response = await api.post<Product>('/products', product)

  return response.data
}

export async function fetchProductSuggestions(productId: string) {
  const response = await anonymousApi.get<SimpleProductForSale[]>(
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
