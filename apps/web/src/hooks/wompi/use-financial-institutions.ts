import { useQuery } from '@tanstack/react-query'
import { getFinancialInstitutions } from '@/api/third-party/wompi'

export const useFinancialInstitutions = (publicKey: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['financial-institutions'],
    queryFn: () => getFinancialInstitutions(publicKey),
  })

  return {
    financialInstitutions: data?.data,
    isLoading,
  }
}
