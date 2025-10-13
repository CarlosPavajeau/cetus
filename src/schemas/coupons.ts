import { CouponDiscountType, CouponRuleType } from '@/api/coupons'
import { type } from 'arktype'

export const CreateCouponRuleSchema = type({
  ruleType: type.valueOf(CouponRuleType),
  value: type.string.moreThanLength(1).configure({
    message: 'El valor de la regla es requerido',
  }),
})

export const CreateCouponSchema = type({
  code: type.string.moreThanLength(1).configure({
    message: 'El código es requerido',
  }),
  description: type.string.optional(),
  discountType: type.valueOf(CouponDiscountType),
  discountValue: type('string.integer.parse')
    .or('number>=0')
    .to('number>=0')
    .configure({
      message: 'El valor del descuento debe ser mayor o igual a 0',
    }),
  usageLimit: type('string.integer.parse')
    .or('number>=0')
    .to('number>=0')
    .configure({
      message: 'El límite de usos debe ser mayor o igual a 0',
    })
    .optional(),
  startDate: type.Date.optional(),
  endDate: type.Date.optional(),
  rules: CreateCouponRuleSchema.array(),
})

export const RedeemCouponSchema = type({
  couponCode: type.string.moreThanLength(1).configure({
    message: 'El código es requerido',
  }),
  orderId: type.string.moreThanLength(1).configure({
    message: 'El ID del pedido es requerido',
  }),
})

export type CreateCoupon = typeof CreateCouponSchema.infer
export type CreateCouponRule = typeof CreateCouponRuleSchema.infer
export type RedeemCoupon = typeof RedeemCouponSchema.infer
