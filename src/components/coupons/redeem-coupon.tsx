import type { Order } from '@/api/orders'
import { Currency } from '@/components/currency'
import { SubmitButton } from '@/components/submit-button'
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
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  order: Order
}

export function RedeemCoupon({ order }: Readonly<Props>) {
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
    if (!error) {
      return
    }

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
          <Currency currency="COP" value={order.total} />
        </span>
      </div>

      <Form {...form}>
        <form className="grid gap-4" onSubmit={onSubmit}>
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
            <SubmitButton
              disabled={isPending}
              isSubmitting={isPending}
              size="sm"
              type="submit"
              variant="outline"
            >
              Aplicar cupón
            </SubmitButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
