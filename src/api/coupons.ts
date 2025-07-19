import { api } from '@/api/client'
import type { CreateCoupon } from '@/schemas/coupons'

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

export async function fetchCoupons(storeSlug?: string) {
  const response = await api.get<Coupon[]>(
    `/coupons${storeSlug ? `?store=${storeSlug}` : ''}`,
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

export async function createCoupon(
  coupon: CreateCoupon,
  storeSlug?: string | undefined,
) {
  const response = await api.post<Coupon>(
    `/coupons${storeSlug ? `?store=${storeSlug}` : ''}`,
    coupon,
  )

  return response.data
}

export type CouponRule = {
  id: number
  ruleType: CouponRuleType
  value: string
}

export async function fetchCouponRules(id: number) {
  const response = await api.get<CouponRule[]>(`/coupons/${id}/rules`)

  return response.data
}

export type RedeemCouponRequest = {
  couponCode: string
  orderId: string
}

export async function redeemCoupon(coupon: RedeemCouponRequest) {
  const response = await api.post<Coupon>(`/coupons/redeem`, coupon)

  return response.data
}
