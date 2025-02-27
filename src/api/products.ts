import axios from 'axios'

export type Product = {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  enabled: boolean
  categoryId: string
  createdAt: string
  updatedAt: string
}

export const fetchProducts = async () => {
  const response = await axios.get<Product[]>(
    `${import.meta.env.PUBLIC_API_URL}/products`,
  )

  return response.data
}

export type CreateProductRequest = Pick<
  Product,
  'name' | 'description' | 'price' | 'stock' | 'categoryId'
>

export const createProduct = async (product: CreateProductRequest) => {
  const response = await axios.post<Product>(
    `${import.meta.env.PUBLIC_API_URL}/products`,
    product,
  )

  return response.data
}

export type UpdateProductRequest = Omit<
  Product,
  'createdAt' | 'updatedAt' | 'categoryId'
>

export const updateProduct = async (product: UpdateProductRequest) => {
  const response = await axios.put<Product>(
    `${import.meta.env.PUBLIC_API_URL}/products/${product.id}`,
    product,
  )

  return response.data
}
