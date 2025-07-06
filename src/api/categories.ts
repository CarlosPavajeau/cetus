import { API_ENDPOINT } from '@/shared/constants'
import axios from 'axios'

export type Category = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const fetchCategories = async (storeSlug?: string) => {
  const response = await axios.get<Category[]>(
    `${API_ENDPOINT}/categories${storeSlug ? `?store=${storeSlug}` : ''}`,
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
    `${API_ENDPOINT}/categories${storeSlug ? `?store=${storeSlug}` : ''}`,
    category,
  )

  return response.data
}

export const updateCategory = async (
  id: string,
  category: UpdateCategoryRequest,
) => {
  const response = await axios.put<Category>(
    `${API_ENDPOINT}/categories/${id}`,
    category,
  )

  return response.data
}

export const deleteCategory = async (id: string) => {
  const response = await axios.delete(`${API_ENDPOINT}/categories/${id}`)

  return response.data
}
