import axios from 'axios'

export type Category = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const fetchCategories = async (storeSlug?: string) => {
  const response = await axios.get<Category[]>(
    `${import.meta.env.PUBLIC_API_URL}/categories${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export type CreateCategoryRequest = Pick<Category, 'name'>
export type UpdateCategoryRequest = Pick<Category, 'name' | 'id'>

export const createCategory = async (
  category: CreateCategoryRequest,
  storeSlug?: string,
) => {
  const response = await axios.post<Category>(
    `${import.meta.env.PUBLIC_API_URL}/categories${storeSlug ? `?store=${storeSlug}` : ''}`,
    category,
  )

  return response.data
}

export const updateCategory = async (
  id: string,
  category: UpdateCategoryRequest,
) => {
  const response = await axios.put<Category>(
    `${import.meta.env.PUBLIC_API_URL}/categories/${id}`,
    category,
  )

  return response.data
}

export const deleteCategory = async (id: string) => {
  const response = await axios.delete(
    `${import.meta.env.PUBLIC_API_URL}/categories/${id}`,
  )

  return response.data
}
