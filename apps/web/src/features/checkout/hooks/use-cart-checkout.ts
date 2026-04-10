import { api } from '@cetus/web/lib/client-api'
import type {
  CreateOrder,
  CreateOrderItem,
} from '@cetus/api-client/types/orders'
import { createOrderSchema } from '@cetus/schemas/order.schema'
import { orderQueries } from '@cetus/web/features/orders/queries'
import type { CartItem } from '@cetus/web/store/cart'
import { useCart } from '@cetus/web/store/cart'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import consola from 'consola'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

function toOrderItems(items: CartItem[]): CreateOrderItem[] {
  return items.map((item) => ({
    variantId: item.product.variantId,
    quantity: item.quantity,
  }))
}

export function useCartCheckout() {
  const { items, totalPrice } = useCart()

  const form = useForm({
    resolver: arktypeResolver(createOrderSchema),
    defaultValues: {
      items: toOrderItems(items),
      customer: {
        documentNumber: '',
      },
    },
  })

  const cityId = useWatch({ control: form.control, name: 'shipping.cityId' })
  const { data: deliveryFee, isLoading: isLoadingDeliveryFee } = useQuery(
    orderQueries.deliveryFees.detail(cityId),
  )

  const navigate = useNavigate()
  const createOrderMutation = useMutation({
    mutationKey: ['orders', 'create'],
    mutationFn: (data: CreateOrder) => api.orders.create(data),
    onSuccess: (data) => {
      navigate({
        to: '/checkout/$id',
        params: { id: data.id },
      })
    },
    onError: (error) => {
      consola.error('Error creating order:', error)
      toast.error(
        'Ha ocurrido un error en la creación de la orden. Intente de nuevo',
      )
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    const freshValues = { ...values, items: toOrderItems(items) }
    createOrderMutation.mutate(freshValues)
  })

  return {
    form,
    items,
    count: items.length,
    total: totalPrice,
    onSubmit,
    deliveryFee,
    isLoadingDeliveryFee,
    isSubmitting: createOrderMutation.isPending,
    isEmpty: items.length === 0,
  }
}
