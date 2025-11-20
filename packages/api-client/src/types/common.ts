export type PaginatedResponse<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type PaginatedQueryParams = {
  page?: number
  pageSize?: number
}

export type ApiError = {
  message: string
  code: string
  details?: Record<string, string[]>
}
