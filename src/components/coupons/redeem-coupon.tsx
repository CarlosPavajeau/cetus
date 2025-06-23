import { Currency } from '@/components/currency'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useRedeemCoupon } from '@/hooks/coupons'
import { useOrder } from '@/hooks/orders'
import { redeemCouponSchema } from '@/schemas/coupons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useForm } from 'react-hook-form'

type Props = {
  orderId: string
}

export function RedeemCoupon({ orderId }: Props) {
  const { order, isLoading } = useOrder(orderId)
  const form = useForm({
    resolver: zodResolver(redeemCouponSchema),
    defaultValues: {
      couponCode: '',
      orderId,
    },
  })

  const queryClient = useQueryClient()
  const onRedeemCouponSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
  }
  const { mutate: redeemCoupon, isPending } = useRedeemCoupon({
    onSuccess: onRedeemCouponSuccess,
  })

  const onSubmit = form.handleSubmit((data) => {
    redeemCoupon(data)
  })

  if (isLoading) return <Skeleton className="h-10 w-full" />

  if (!order) return null

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-0.5 font-medium">
        <span className="text-muted-foreground text-sm">Total a pagar</span>
        <span>
          <Currency value={order.total} currency="COP" />
        </span>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="grid gap-4">
          <FormField
            control={form.control}
            name="couponCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código del cupón</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Ingresa un código para obtener descuentos
                </FormDescription>
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={isPending}
            >
              {isPending && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Aplicar cupón
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
