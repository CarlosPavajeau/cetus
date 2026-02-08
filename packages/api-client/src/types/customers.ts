export type Customer = {
  id: string
  documentType?: DocumentType
  documentNumber?: string
  name: string
  email?: string
  phone: string

  since?: string
  totalPurchases: number
  totalSpent: number
  purchaseFrequencyDays?: number
}

export type DocumentType = 'CC' | 'CE' | 'NIT' | 'PP' | 'OTHER'

export type CustomerSummaryResponse = {
  id: string
  name: string
  phone: string
  email?: string
  totalOrders: number
  totalSpent: number
  lastPurchase?: string
}

export type CustomerSortBy = 'name' | 'total_spent' | 'last_purchase'

export type CustomerQueryParams = {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: CustomerSortBy
}
