import {
  createCoupon,
  fetchCouponRules,
  fetchCoupons,
  redeemCoupon,
} from '@/api/coupons'
import { useMutation, useQuery } from '@tanstack/react-query'

export function useCoupons() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['coupons'],
    queryFn: fetchCoupons,
  })

  return {
    coupons: data,
    isLoading,
    error,
  }
}

type UseCreateCouponProps = {
  onSuccess?: () => void
}

export function useCreateCoupon({ onSuccess }: UseCreateCouponProps) {
  return useMutation({
    mutationKey: ['create-coupon'],
    mutationFn: createCoupon,
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
