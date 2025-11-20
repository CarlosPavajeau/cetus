import { anonymousClient, authenticatedClient } from '../core/instance'
import type {
  Coupon,
  CouponRule,
  CreateCoupon,
  RedeemCouponRequest,
} from '../types/coupons'

export const couponsApi = {
  list: () => authenticatedClient.get<Coupon[]>('/coupons'),

  listRules: (id: number) =>
    authenticatedClient.get<CouponRule[]>(`/coupons/${id}/rules`),

  create: (data: CreateCoupon) =>
    authenticatedClient.post<Coupon>('/coupons', data),

  redeem: (coupon: RedeemCouponRequest) =>
    anonymousClient.post<Coupon>('/coupons/redeem', coupon),
}
