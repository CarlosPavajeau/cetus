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
    `${import.meta.env.PUBLIC_API_URL}/products${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export const fetchProduct = async (id: string) => {
  const response = await axios.get<Product>(
    `${import.meta.env.PUBLIC_API_URL}/products/${id}`,
  )

  return response.data
}

export type ProductForSale = Omit<
  Product,
  'createdAt' | 'updatedAt' | 'enabled'
>

export const fetchProductsForSale = async (storeSlug?: string) => {
  const response = await axios.get<ProductForSale[]>(
    `${import.meta.env.PUBLIC_API_URL}/products/for-sale${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export type CreateProductRequest = Pick<
  Product,
  'name' | 'description' | 'price' | 'stock' | 'categoryId'
> & { imageUrl: string }

export const createProduct = async (
  product: CreateProductRequest,
  storeSlug?: string,
) => {
  const response = await axios.post<Product>(
    `${import.meta.env.PUBLIC_API_URL}/products${storeSlug ? `?store=${storeSlug}` : ''}`,
    product,
  )

  return response.data
}

export async function fetchProductSuggestions(productId: string) {
  const response = await axios.get<ProductForSale[]>(
    `${import.meta.env.PUBLIC_API_URL}/products/suggestions?productId=${productId}`,
  )

  return response.data
}

export type UpdateProductRequest = Omit<
  Product,
  'createdAt' | 'updatedAt' | 'slug' | 'rating' | 'reviewsCount'
>

export const updateProduct = async (product: UpdateProductRequest) => {
  const response = await axios.put<Product>(
    `${import.meta.env.PUBLIC_API_URL}/products/${product.id}`,
    product,
  )

  return response.data
}

export const deleteProduct = async (id: string) => {
  await axios.delete(`${import.meta.env.PUBLIC_API_URL}/products/${id}`)
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
    `${import.meta.env.PUBLIC_API_URL}/products/top-selling${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export async function fetchProductBySlug(slug: string) {
  const response = await axios.get<ProductForSale>(
    `${import.meta.env.PUBLIC_API_URL}/products/slug/${slug}`,
  )

  return response.data
}
