import { getFinancialInstitutions } from '@/api/third-party/wompi'
import { useQuery } from '@tanstack/react-query'

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
