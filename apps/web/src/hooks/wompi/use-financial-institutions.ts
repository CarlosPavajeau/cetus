import { useQuery } from '@tanstack/react-query'
import { getFinancialInstitutions } from '@/api/third-party/wompi'

export const useFinancialInstitutions = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['financial-institutions'],
    queryFn: getFinancialInstitutions,
  })

  return {
    financialInstitutions: data?.data,
    isLoading,
  }
}
