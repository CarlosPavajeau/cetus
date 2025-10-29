import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useRouter } from '@tanstack/react-router'
import { TagIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { Order } from '@/api/orders'
import { SubmitButton } from '@/components/submit-button'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useRedeemCoupon } from '@/hooks/coupons'
import { RedeemCouponSchema } from '@/schemas/coupons'
import { extractErrorDetail } from '@/shared/error'

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
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium text-sm">
        <TagIcon className="h-4 w-4" />
        <span>Cupon de descuento</span>
      </div>

      <Form {...form}>
        <form id="redeem-coupon" onSubmit={onSubmit}>
          <FieldGroup>
            <Controller
              control={form.control}
              name="couponCode"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex w-full items-center gap-2">
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      id="coupon-code"
                      placeholder="Ingresa tu código de cupón"
                    />

                    <SubmitButton
                      disabled={isPending}
                      form="redeem-coupon"
                      isSubmitting={isPending}
                      type="submit"
                      variant="secondary"
                    >
                      Aplicar cupón
                    </SubmitButton>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </Form>
    </div>
  )
}
