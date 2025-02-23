export type Category = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const fetchCategories = async () => {
  const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/categories`)
  const data = (await response.json()) as Category[]
  return data
}
