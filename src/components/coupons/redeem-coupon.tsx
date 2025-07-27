import type { Order } from '@/api/orders'
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
import { useRedeemCoupon } from '@/hooks/coupons'
import { RedeemCouponSchema } from '@/schemas/coupons'
import { extractErrorDetail } from '@/shared/error'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useRouter } from '@tanstack/react-router'
import { Loader2Icon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  order: Order
}

export function RedeemCoupon({ order }: Props) {
  const form = useForm({
    resolver: arktypeResolver(RedeemCouponSchema),
    defaultValues: {
      couponCode: '',
      orderId: order.id,
    },
  })

  const router = useRouter()
  const onRedeemCouponSuccess = () => {
    router.invalidate()
  }

  const {
    mutate: redeemCoupon,
    isPending,
    error,
  } = useRedeemCoupon({
    onSuccess: onRedeemCouponSuccess,
  })

  useEffect(() => {
    if (!error) return

    form.setError('couponCode', {
      type: 'manual',
      message: extractErrorDetail(error),
    })
  }, [error, form])

  const onSubmit = form.handleSubmit((data) => {
    redeemCoupon(data)
  })

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
