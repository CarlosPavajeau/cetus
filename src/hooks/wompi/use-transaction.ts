import { getTransaction } from '@/api/third-party/wompi'
import { useQuery } from '@tanstack/react-query'

export const useTransaction = (transactionId: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => getTransaction(transactionId),
  })

  return {
    transaction: data,
    isLoading,
  }
}
