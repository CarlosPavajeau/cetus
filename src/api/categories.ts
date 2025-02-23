import axios from 'axios'

export type Category = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const fetchCategories = async () => {
  const response = await axios.get<Category[]>(
    `${import.meta.env.PUBLIC_API_URL}/categories`,
  )

  return response.data
}

export type CreateCategoryRequest = Pick<Category, 'name'>

export const createCategory = async (category: CreateCategoryRequest) => {
  const response = await axios.post<Category>(
    `${import.meta.env.PUBLIC_API_URL}/categories`,
    category,
  )

  return response.data
}
