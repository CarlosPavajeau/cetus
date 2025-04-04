import { Checkbox } from '@/components/ui/checkbox'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { useMerchant } from '@/hooks/wompi/use-merchant'
import type { PaymentFormValues } from '@/schemas/payments'
import { ShieldCheckIcon } from 'lucide-react'
import { useFormContext } from 'react-hook-form'

export const PaymentConsent = () => {
  const { merchant } = useMerchant()
  const form = useFormContext<PaymentFormValues>()

  if (!merchant) return null

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="presigned_acceptance"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label
                htmlFor="presigned_acceptance"
                className="text-muted-foreground"
              >
                Acepto haber leído{' '}
                <a
                  href={merchant.data.presigned_acceptance.permalink}
                  className="text-foreground underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  los reglamentos
                </a>{' '}
                para hacer este pago.
              </Label>
            </div>

            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="presigned_personal_data_auth"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label
                htmlFor="presigned_acceptance"
                className="text-muted-foreground"
              >
                Acepto la{' '}
                <a
                  href={merchant.data.presigned_personal_data_auth.permalink}
                  className="text-foreground underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  autorización para la administración de datos personales
                </a>
              </Label>
            </div>

            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="text-foreground" size={16} />
        <p className="text-muted-foreground text-xs">
          Pagos seguros con Wompi.
        </p>
      </div>
    </div>
  )
}
