import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  Coupon,
  CouponRule,
  CreateCoupon,
  RedeemCouponRequest,
} from '../types/coupons'

const definitions = {
  list: {
    method: 'GET',
    path: '/coupons',
  } as EndpointDefinition<Coupon[]>,
  listRules: {
    method: 'GET',
    path: (id: number) => `/coupons/${id}/rules`,
  } as EndpointDefinition<CouponRule[], void, number>,
  create: {
    method: 'POST',
    path: '/coupons',
  } as EndpointDefinition<Coupon, CreateCoupon>,
  redeem: {
    method: 'POST',
    path: '/coupons/redeem',
  } as EndpointDefinition<Coupon, RedeemCouponRequest>,
}

export const couponsApi = defineResource(definitions)
