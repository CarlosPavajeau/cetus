import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  Category,
  CategoryBySlugResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../types/categories'

const definitions = {
  list: {
    method: 'GET',
    path: '/categories',
  } as EndpointDefinition<Category[]>,
  create: {
    method: 'POST',
    path: '/categories',
  } as EndpointDefinition<Category, CreateCategoryRequest>,
  update: {
    method: 'PUT',
    path: (id: string) => `/categories/${id}`,
  } as EndpointDefinition<Category, UpdateCategoryRequest, string>,
  delete: {
    method: 'DELETE',
    path: (id: string) => `/categories/${id}`,
  } as EndpointDefinition<void, void, string>,
  getBySlug: {
    method: 'GET',
    path: (slug: string) => `/categories/${slug}`,
  } as EndpointDefinition<CategoryBySlugResponse, void, string>,
}

export const categoriesApi = defineResource(definitions)
