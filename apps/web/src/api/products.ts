import { anonymousApi, api } from '@/api/client'
import type {
  CreateProduct,
  CreateProductOptionType,
  CreateProductVariant,
  CreateSimpleProduct,
  UpdateProduct,
  UpdateProductVariant,
} from '@/schemas/product'

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
  categoryId: string
  category: string
  enabled: boolean
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
  enabled: boolean
  featured: boolean
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

export async function createProduct(product: CreateProduct) {
  const response = await api.post<Product>('/products', product)

  return response.data
}

export async function createSimpleProduct(product: CreateSimpleProduct) {
  const response = await api.post<Product>('/products/simple', product)

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

export type ProductOptionTypeValue = {
  id: number
  value: string
}

export type ProductOptionType = {
  id: number
  name: string
  values: ProductOptionTypeValue[]
}

export async function fetchProductOptionTypes() {
  const response = await api.get<ProductOptionType[]>('/products/option-types')

  return response.data
}

export async function createProductOptionType(
  optionType: CreateProductOptionType,
) {
  const response = await api.post<ProductOptionType>(
    '/products/option-types',
    optionType,
  )

  return response.data
}

export async function createProductVariant(variant: CreateProductVariant) {
  const response = await api.post<ProductVariantResponse>(
    `products/${variant.productId}/variants`,
    variant,
  )

  return response.data
}

export async function fetchProductVariants(productId: string) {
  const response = await api.get<ProductVariantResponse[]>(
    `products/${productId}/variants`,
  )

  return response.data
}

export async function fetchProductVariant(id: number) {
  const response = await api.get<ProductVariantResponse>(
    `products/variants/${id}`,
  )

  return response.data
}

export type CreateProductOption = {
  productId: string
  optionTypeId: number
}

export async function createProductOption(option: CreateProductOption) {
  return await api.post(`products/${option.productId}/options`, option)
}

export type ProductOptionResponse = {
  productId: string
  optionTypeId: number
  optionType: ProductOptionType
}

export async function fetchProductOptions(productId: string) {
  const response = await api.get<ProductOptionResponse[]>(
    `products/${productId}/options`,
  )

  return response.data
}

export async function updateProductVariant(variant: UpdateProductVariant) {
  const response = await api.put<ProductVariantResponse>(
    `products/variants/${variant.id}`,
    variant,
  )

  return response.data
}

export type OrderVariantImages = {
  variantId: number
  images: ProductImage[]
}

export async function orderProductVariantImages(data: OrderVariantImages) {
  const response = await api.put(
    `products/variants/${data.variantId}/images/order`,
    data,
  )

  return response.data
}
