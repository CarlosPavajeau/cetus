import { api } from '@/api/client'

export type Category = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const fetchCategories = async (storeSlug?: string) => {
  const response = await api.get<Category[]>(
    `/categories${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export type CreateCategoryRequest = Pick<Category, 'name'>
export type UpdateCategoryRequest = Pick<Category, 'name' | 'id'>

export const createCategory = async (
  category: CreateCategoryRequest,
  storeSlug?: string,
) => {
  const response = await api.post<Category>(
    `/categories${storeSlug ? `?store=${storeSlug}` : ''}`,
    category,
  )

  return response.data
}

export const updateCategory = async (
  id: string,
  category: UpdateCategoryRequest,
) => {
  const response = await api.put<Category>(`/categories/${id}`, category)

  return response.data
}

export const deleteCategory = async (id: string) => {
  const response = await api.delete(`/categories/${id}`)

  return response.data
}
