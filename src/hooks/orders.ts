import {
  fetchDeliveryFee,
  fetchDeliveryFees,
  fetchOrder,
  fetchOrderInsights,
  fetchOrders,
  fetchOrdersSummary,
} from '@/api/orders'
import { useQuery } from '@tanstack/react-query'

export function useOrderInsights(month: string, storeSlug?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['order-insights', month, storeSlug],
    queryFn: () => fetchOrderInsights(month, storeSlug),
  })

  return {
    insights: data,
    isLoading,
  }
}

export function useOrder(id: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => fetchOrder(id),
    refetchOnMount: false,
  })

  return {
    order: data,
    isLoading,
    error,
  }
}

export function useOrders(storeSlug?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', storeSlug],
    queryFn: () => fetchOrders(storeSlug),
    enabled: !!storeSlug,
  })

  return {
    orders: data,
    isLoading,
    error,
  }
}

export function useOrdersSummary(month: string, storeSlug?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['orders-summary', month, storeSlug],
    queryFn: () => fetchOrdersSummary(month, storeSlug),
  })

  return {
    summary: data,
    isLoading,
  }
}

export function useDeliveryFee(cityId?: string, storeSlug?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-fee', cityId, storeSlug],
    queryFn: () => fetchDeliveryFee(cityId!, storeSlug),
    enabled: !!cityId,
  })

  return {
    deliveryFee: data,
    isLoading,
  }
}

export function useDeliveryFees(storeSlug?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-fees', storeSlug],
    queryFn: () => fetchDeliveryFees(storeSlug),
  })

  return {
    deliveryFees: data,
    isLoading,
  }
}
