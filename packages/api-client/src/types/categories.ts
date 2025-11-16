export type Category = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type CreateCategoryRequest = Pick<Category, 'name'>
export type UpdateCategoryRequest = Pick<Category, 'name' | 'id'>

export type CategoryBySlugResponse = {
  id: string
  name: string
  slug: string
  storeId: string
}
