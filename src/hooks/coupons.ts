import { createCoupon, fetchCoupons } from '@/api/coupons'
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
