import axios from 'axios'

export type Product = {
  id: string
  name: string
  description?: string
  price: number
  stock: number
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
  'name' | 'description' | 'price' | 'stock'
>

export const createProduct = async (product: CreateProductRequest) => {
  const response = await axios.post<Product>(
    `${import.meta.env.PUBLIC_API_URL}/products`,
    product,
  )

  return response.data
}
