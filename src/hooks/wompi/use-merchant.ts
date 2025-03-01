import { getMerchant } from '@/api/third-party/wompi'
import { useQuery } from '@tanstack/react-query'

export const useMerchant = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['merchant'],
    queryFn: getMerchant,
  })

  return {
    merchant: data,
    isLoading,
  }
}
