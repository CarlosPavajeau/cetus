import axios from 'axios'

export enum CouponDiscountType {
  Percentage,
  FixedAmount,
  FreeShipping,
}

export const CouponDiscountTypeText = {
  [CouponDiscountType.Percentage]: 'Porcentaje',
  [CouponDiscountType.FixedAmount]: 'Monto fijo',
  [CouponDiscountType.FreeShipping]: 'Envío gratis',
}

export type Coupon = {
  id: number
  code: string
  description?: string
  discountType: CouponDiscountType
  discountValue: number
  usageCount: number
  usageLimit?: number
  isActive: boolean
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

export async function fetchCoupons() {
  const response = await axios.get<Coupon[]>(
    `${import.meta.env.PUBLIC_API_URL}/coupons`,
  )

  return response.data
}

export enum CouponRuleType {
  MinPurchaseAmount,
  SpecificProduct,
  SpecificCategory,
  OnePerCustomer,
}

export const CouponRuleTypeText = {
  [CouponRuleType.MinPurchaseAmount]: 'Monto mínimo de compra',
  [CouponRuleType.SpecificProduct]: 'Producto específico',
  [CouponRuleType.SpecificCategory]: 'Categoría específica',
  [CouponRuleType.OnePerCustomer]: 'Un cupón por cliente',
}

export type CreateCouponRule = {
  ruleType: CouponRuleType
  value: string
}

export type CreateCouponRequest = {
  code: string
  description?: string
  discountType: CouponDiscountType
  discountValue: number
  usageLimit?: number
  startDate?: Date
  endDate?: Date
  rules: CreateCouponRule[]
}

export async function createCoupon(coupon: CreateCouponRequest) {
  const response = await axios.post<Coupon>(
    `${import.meta.env.PUBLIC_API_URL}/coupons`,
    coupon,
  )

  return response.data
}
