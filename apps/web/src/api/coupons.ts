import { anonymousApi, api } from '@/api/client'
import type { CreateCoupon } from '@/schemas/coupons'

export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_shipping'

export const CouponDiscountTypeText: Record<CouponDiscountType, string> = {
  percentage: 'Porcentaje',
  fixed_amount: 'Monto fijo',
  free_shipping: 'Envío gratis',
}

export type CouponDiscountTypeOption = {
  value: CouponDiscountType
  label: string
}

export const COUPON_DISCOUNT_TYPE_OPTIONS: CouponDiscountTypeOption[] = [
  {
    value: 'percentage',
    label: CouponDiscountTypeText.percentage,
  },
  {
    value: 'fixed_amount',
    label: CouponDiscountTypeText.fixed_amount,
  },
  {
    value: 'free_shipping',
    label: CouponDiscountTypeText.free_shipping,
  },
] as const

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
  const response = await api.get<Coupon[]>('/coupons')

  return response.data
}

export type CouponRuleType =
  | 'min_purchase_amount'
  | 'specific_product'
  | 'specific_category'
  | 'one_per_customer'

export const CouponRuleTypeText: Record<CouponRuleType, string> = {
  min_purchase_amount: 'Monto mínimo de compra',
  specific_product: 'Producto específico',
  specific_category: 'Categoría específica',
  one_per_customer: 'Un cupón por cliente',
}

export type CouponRuleTypeOption = {
  value: CouponRuleType
  label: string
}

export const COUPON_RULE_TYPE_OPTIONS: CouponRuleTypeOption[] = [
  {
    value: 'min_purchase_amount',
    label: CouponRuleTypeText.min_purchase_amount,
  },
  {
    value: 'specific_product',
    label: CouponRuleTypeText.specific_product,
  },
  {
    value: 'specific_category',
    label: CouponRuleTypeText.specific_category,
  },
  {
    value: 'one_per_customer',
    label: CouponRuleTypeText.one_per_customer,
  },
]

export async function createCoupon(coupon: CreateCoupon) {
  const response = await api.post<Coupon>('/coupons', coupon)

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
  const response = await anonymousApi.post<Coupon>('/coupons/redeem', coupon)

  return response.data
}
