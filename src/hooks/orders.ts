import {
  fetchDeliveryFee,
  fetchDeliveryFees,
  fetchOrder,
  fetchOrderInsights,
  fetchOrders,
  fetchOrdersSummary,
} from '@/api/orders'
import { useQuery } from '@tanstack/react-query'

export function useOrderInsights(month: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['order-insights', month],
    queryFn: () => fetchOrderInsights(month),
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

export function useOrders() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders(),
  })

  return {
    orders: data,
    isLoading,
    error,
  }
}

export function useOrdersSummary(month: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['orders-summary', month],
    queryFn: () => fetchOrdersSummary(month),
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

export function useDeliveryFees() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-fees'],
    queryFn: () => fetchDeliveryFees(),
  })

  return {
    deliveryFees: data,
    isLoading,
  }
}
