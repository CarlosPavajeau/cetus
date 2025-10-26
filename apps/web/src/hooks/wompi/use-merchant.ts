import { useQuery } from '@tanstack/react-query'
import { getMerchant } from '@/api/third-party/wompi'

export const useMerchant = (publicKey: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['merchant'],
    queryFn: () => getMerchant(publicKey),
  })

  return {
    merchant: data,
    isLoading,
  }
}
