import { anonymousClient, authenticatedClient } from '../core/instance'
import type {
  Category,
  CategoryBySlugResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../types/categories'

export const categoriesApi = {
  list: () => anonymousClient.get<Category[]>('/categories'),

  create: (data: CreateCategoryRequest) =>
    authenticatedClient.post<Category>('/categories', data),

  update: (id: string, data: UpdateCategoryRequest) =>
    authenticatedClient.put<Category>(`/categories/${id}`, data),

  delete: (id: string) => authenticatedClient.delete(`/categories/${id}`),

  getBySlug: (slug: string) =>
    anonymousClient.get<CategoryBySlugResponse>(`/categories/${slug}`),
}
