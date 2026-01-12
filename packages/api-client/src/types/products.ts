export type ProductImage = {
  id: number
  imageUrl: string
  altText?: string
  sortOrder: number
}

export type Product = {
  id: string
  name: string
  slug: string
  description?: string
  categoryId: string
  category: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type ProductOptionValue = {
  id: number
  value: string
  optionTypeId: number
  optionTypeName: string
}

export type ProductVariantResponse = {
  id: number
  sku: string
  price: number
  stock: number
  salesCount: number
  images: ProductImage[]
  optionValues: ProductOptionValue[]
  enabled: boolean
  featured: boolean
}

export type ProductForSale = {
  id: string
  name: string
  slug: string
  description?: string
  rating: number
  reviewsCount: number
  categoryId: string
  category?: string
  categorySlug: string
  storeId: string

  variants: ProductVariantResponse[]
}

export type SimpleProductForSale = {
  id: string
  name: string
  slug: string
  imageUrl: string
  price: number
  rating: number
  reviewsCount: number
  categoryId: string
  variantId: number
}

export type ProductOptionTypeValue = {
  id: number
  value: string
}

export type ProductOptionType = {
  id: number
  name: string
  values: ProductOptionTypeValue[]
}

export type CreateProductOption = {
  productId: string
  optionTypeId: number
}

export type ProductOptionResponse = {
  productId: string
  optionTypeId: number
  optionType: ProductOptionType
}

export type OrderVariantImages = {
  variantId: number
  images: ProductImage[]
}

export type CreateProductImage = {
  id: string
  imageUrl: string
  sortOrder: number
}

export type AddVariantImages = {
  id: number
  images: CreateProductImage[]
}

export type AddVariantImagesResponse = {
  id: number
  images: ProductImage[]
}

export type CreateProduct = {
  name: string
  categoryId: string
  description?: string
}

export type CreateSimpleProduct = {
  name: string
  categoryId: string
  sku: string
  price: number
  stock: number
  images: {
    id: string
    imageUrl: string
    sortOrder: number
  }[]
  description?: string
}

export type UpdateProduct = {
  id: string
  name: string
  categoryId: string
  enabled: boolean
  description?: string
}

export type CreateProductOptionType = {
  name: string
  values: string[]
}

export type CreateProductVariant = {
  productId: string
  sku: string
  price: number
  stock: number
  optionValueIds: number[]
  images: {
    id: string
    imageUrl: string
    sortOrder: number
  }[]
}

export type UpdateProductVariant = {
  id: number
  stock: number
  price: number
  enabled: boolean
  featured: boolean
}

export type TopSellingProduct = {
  id: string
  name: string
  imageUrl?: string
  category?: string
  salesCount: number
}

export type SearchProductVariantResponse = {
  id: number
  sku: string
  price: number
  stock: number
  imageUrl?: string
  optionValues: ProductOptionValue[]
}

export type SearchProductResponse = {
  id: string
  name: string
  slug: string
  description?: string
  rating: number
  reviewsCount: number
  categoryId: string
  category?: string
  categorySlug: string
  storeId: string

  variants: SearchProductVariantResponse[]
}

export type AdjustmentType = 'delta' | 'snapshot'

export type InventoryAdjustmentItem = {
  variantId: number
  value: number
  type: AdjustmentType
  reason?: string
}

export type AdjustInventoryStock = {
  globalReason?: string
  userId: string
  adjustments: InventoryAdjustmentItem[]
}

export type InventoryTransactionType =
  | 'sale'
  | 'adjustment'
  | 'return'
  | 'purchase'
  | 'transfer'

export type InventoryTransaction = {
  id: string
  createdAt: Date
  productName: string
  sku: string
  variantId: number
  optionValues: ProductOptionValue[]
  type: InventoryTransactionType
  quantity: number
  stockAfter: number
  reason?: string
  referenceId?: string
}

export type InventoryTransactionQueryParams = {
  page: number
  pageSize: number
  variantId?: number
  types?: string[]
  from?: Date
  to?: Date
}
