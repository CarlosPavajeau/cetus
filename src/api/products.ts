import type { CreateProduct, UpdateProduct } from '@/schemas/product'
import { API_ENDPOINT } from '@/shared/constants'
import axios from 'axios'

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
  const response = await axios.get<Product[]>(
    `${API_ENDPOINT}/products${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export const fetchProduct = async (id: string) => {
  const response = await axios.get<Product>(`${API_ENDPOINT}/products/${id}`)

  return response.data
}

export type ProductForSale = Omit<
  Product,
  'createdAt' | 'updatedAt' | 'enabled'
>

export const fetchProductsForSale = async (storeSlug?: string) => {
  const response = await axios.get<ProductForSale[]>(
    `${API_ENDPOINT}/products/for-sale${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export async function fetchFeaturedProducts(storeSlug?: string) {
  const response = await axios.get<ProductForSale[]>(
    `${API_ENDPOINT}/products/featured${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export async function fetchPopularProducts(storeSlug?: string) {
  const response = await axios.get<ProductForSale[]>(
    `${API_ENDPOINT}/products/popular${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export const createProduct = async (
  product: CreateProduct,
  storeSlug?: string,
) => {
  const response = await axios.post<Product>(
    `${API_ENDPOINT}/products${storeSlug ? `?store=${storeSlug}` : ''}`,
    product,
  )

  return response.data
}

export async function fetchProductSuggestions(productId: string) {
  const response = await axios.get<ProductForSale[]>(
    `${API_ENDPOINT}/products/suggestions?productId=${productId}`,
  )

  return response.data
}

export const updateProduct = async (product: UpdateProduct) => {
  const response = await axios.put<Product>(
    `${API_ENDPOINT}/products/${product.id}`,
    product,
  )

  return response.data
}

export const deleteProduct = async (id: string) => {
  await axios.delete(`${API_ENDPOINT}/products/${id}`)
}

export type TopSellingProduct = {
  id: string
  name: string
  imageUrl?: string
  category?: string
  salesCount: number
}

export async function fetchTopSellingProducts(storeSlug?: string) {
  const response = await axios.get<TopSellingProduct[]>(
    `${API_ENDPOINT}/products/top-selling${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export async function fetchProductBySlug(slug: string) {
  const response = await axios.get<ProductForSale>(
    `${API_ENDPOINT}/products/slug/${slug}`,
  )

  return response.data
}
