export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_shipping'

export type CouponDiscountTypeOption = {
  value: CouponDiscountType
  label: string
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

export type CouponRuleType =
  | 'min_purchase_amount'
  | 'specific_product'
  | 'specific_category'
  | 'one_per_customer'

export type CouponRuleTypeOption = {
  value: CouponRuleType
  label: string
}

export type CouponRule = {
  id: number
  ruleType: CouponRuleType
  value: string
}

export type RedeemCouponRequest = {
  couponCode: string
  orderId: string
}

export type CreateCoupon = {
  code: string
  discountType: CouponDiscountType
  discountValue: number
  rules: {
    ruleType: CouponRuleType
    value: string
  }[]
  description?: string | undefined
  usageLimit?: number | undefined
  startDate?: Date | undefined
  endDate?: Date | undefined
}
