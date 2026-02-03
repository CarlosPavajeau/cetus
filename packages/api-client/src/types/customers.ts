export type Customer = {
  id: string
  documentType?: DocumentType
  documentNumber?: string
  name: string
  email?: string
  phone: string
}

export type DocumentType = 'CC' | 'CE' | 'NIT' | 'PP' | 'OTHER'
