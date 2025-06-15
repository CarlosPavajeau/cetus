import axios from 'axios'

export enum CouponDiscountType {
  Percentage = 0,
  FixedAmount = 1,
  FreeShipping = 2,
}

export const CouponDiscountTypeText = {
  [CouponDiscountType.Percentage]: 'Porcentaje',
  [CouponDiscountType.FixedAmount]: 'Monto fijo',
  [CouponDiscountType.FreeShipping]: 'Envío gratis',
}

export const COUPON_DISCOUNT_TYPE_OPTIONS = [
  {
    value: CouponDiscountType.Percentage,
    label: CouponDiscountTypeText[CouponDiscountType.Percentage],
  },
  {
    value: CouponDiscountType.FixedAmount,
    label: CouponDiscountTypeText[CouponDiscountType.FixedAmount],
  },
  {
    value: CouponDiscountType.FreeShipping,
    label: CouponDiscountTypeText[CouponDiscountType.FreeShipping],
  },
]

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
  MinPurchaseAmount = 0,
  SpecificProduct = 1,
  SpecificCategory = 2,
  OnePerCustomer = 3,
}

export const CouponRuleTypeText = {
  [CouponRuleType.MinPurchaseAmount]: 'Monto mínimo de compra',
  [CouponRuleType.SpecificProduct]: 'Producto específico',
  [CouponRuleType.SpecificCategory]: 'Categoría específica',
  [CouponRuleType.OnePerCustomer]: 'Un cupón por cliente',
}

export const COUPON_RULE_TYPE_OPTIONS = [
  {
    value: CouponRuleType.MinPurchaseAmount,
    label: CouponRuleTypeText[CouponRuleType.MinPurchaseAmount],
  },
  {
    value: CouponRuleType.SpecificProduct,
    label: CouponRuleTypeText[CouponRuleType.SpecificProduct],
  },
  {
    value: CouponRuleType.SpecificCategory,
    label: CouponRuleTypeText[CouponRuleType.SpecificCategory],
  },
  {
    value: CouponRuleType.OnePerCustomer,
    label: CouponRuleTypeText[CouponRuleType.OnePerCustomer],
  },
]

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
