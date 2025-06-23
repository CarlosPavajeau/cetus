import { CouponDiscountType, CouponRuleType } from '@/api/coupons'
import { z } from 'zod'

export const couponDiscountType = z.nativeEnum(CouponDiscountType, {
  errorMap: () => ({ message: 'El tipo de descuento es requerido' }),
})
export const couponRuleType = z.nativeEnum(CouponRuleType, {
  errorMap: () => ({ message: 'El tipo de regla es requerido' }),
})

export const createCouponRuleSchema = z.object({
  ruleType: couponRuleType,
  value: z.string().min(1, 'El valor de la regla es requerido'),
})

export const createCouponSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  description: z.string().optional(),
  discountType: couponDiscountType,
  discountValue: z.coerce
    .number()
    .min(0, 'El valor del descuento debe ser mayor o igual a 0'),
  usageLimit: z.coerce
    .number()
    .min(0, 'El límite de usos debe ser mayor o igual a 0')
    .optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  rules: z.array(createCouponRuleSchema),
})

export const redeemCouponSchema = z.object({
  couponCode: z.string().min(1, 'El código es requerido'),
  orderId: z.string().min(1, 'El ID del pedido es requerido'),
})
