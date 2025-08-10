import { anonymousApi, api } from '@/api/client'

export type Category = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const fetchCategories = async (store: string) => {
  const response = await anonymousApi.get<Category[]>('/categories', {
    params: { store },
  })

  return response.data
}

export type CreateCategoryRequest = Pick<Category, 'name'>
export type UpdateCategoryRequest = Pick<Category, 'name' | 'id'>

export const createCategory = async (category: CreateCategoryRequest) => {
  const response = await api.post<Category>('/categories', category)

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

type FindCategoryBySlugResponse = {
  id: string
  name: string
  slug: string
  storeId: string
}

export async function fetchCategoryBySlug(slug: string) {
  const response = await anonymousApi.get<FindCategoryBySlugResponse>(
    `/categories/${slug}`,
  )

  return response.data
}
