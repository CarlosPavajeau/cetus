import { api } from '@cetus/api-client'
import type { Order } from '@cetus/api-client/types/orders'
import { redeemCouponSchema } from '@cetus/schemas/coupon.schema'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Form } from '@cetus/ui/form'
import { Input } from '@cetus/ui/input'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { extractErrorDetail } from '@cetus/web/shared/error'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

type Props = {
  order: Order
}

export function RedeemCoupon({ order }: Readonly<Props>) {
  const form = useForm({
    resolver: arktypeResolver(redeemCouponSchema),
    defaultValues: {
      couponCode: '',
      orderId: order.id,
    },
  })

  const router = useRouter()
  const {
    mutate: redeemCoupon,
    isPending,
    error,
  } = useMutation({
    mutationKey: ['coupons', 'redeem'],
    mutationFn: api.coupons.redeem,
    onSuccess: () => {
      router.invalidate()
    },
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
      <Form {...form}>
        <form id="redeem-coupon" onSubmit={onSubmit}>
          <FieldGroup>
            <Controller
              control={form.control}
              name="couponCode"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Cupón de descuento</FieldLabel>

                  <Field
                    data-invalid={fieldState.invalid}
                    orientation="horizontal"
                  >
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      disabled={isPending}
                      id="coupon-code"
                      placeholder="Ingresa tu código de cupón"
                    />
                    <SubmitButton
                      disabled={isPending}
                      form="redeem-coupon"
                      isSubmitting={isPending}
                      type="submit"
                    >
                      Aplicar cupón
                    </SubmitButton>
                  </Field>

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
