import {
  type CreateCouponRequest,
  createCoupon,
  fetchCouponRules,
  fetchCoupons,
  redeemCoupon,
} from '@/api/coupons'
import { useMutation, useQuery } from '@tanstack/react-query'

export function useCoupons(storeSlug?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['coupons', storeSlug],
    queryFn: () => fetchCoupons(storeSlug),
  })

  return {
    coupons: data,
    isLoading,
    error,
  }
}

type UseCreateCouponProps = {
  onSuccess?: () => void
  storeSlug?: string
}

export function useCreateCoupon({
  onSuccess,
  storeSlug,
}: UseCreateCouponProps) {
  return useMutation({
    mutationKey: ['create-coupon', storeSlug],
    mutationFn: (coupon: CreateCouponRequest) =>
      createCoupon(coupon, storeSlug),
    onSuccess,
  })
}

export function useCouponRules(id: number) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['coupon-rules', id],
    queryFn: () => fetchCouponRules(id),
  })

  return {
    couponRules: data,
    isLoading,
    error,
  }
}

type UseRedeemCouponProps = {
  onSuccess?: () => void
}

export function useRedeemCoupon({ onSuccess }: UseRedeemCouponProps) {
  return useMutation({
    mutationKey: ['redeem-coupon'],
    mutationFn: redeemCoupon,
    onSuccess,
  })
}
