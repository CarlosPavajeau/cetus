import { useQuery } from '@tanstack/react-query'
import { getMerchant } from '@/api/third-party/wompi'

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
