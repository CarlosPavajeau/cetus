import { ShieldCheckIcon } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { useMerchant } from '@/hooks/wompi/use-merchant'
import type { PaymentValues } from '@/schemas/payments'

export const PaymentConsent = () => {
  const { merchant } = useMerchant()
  const form = useFormContext<PaymentValues>()

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
                className="text-muted-foreground"
                htmlFor="presigned_acceptance"
              >
                Acepto haber leído{' '}
                <a
                  className="text-foreground underline"
                  href={merchant.data.presigned_acceptance.permalink}
                  rel="noopener noreferrer"
                  target="_blank"
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
                className="text-muted-foreground"
                htmlFor="presigned_acceptance"
              >
                Acepto la{' '}
                <a
                  className="text-foreground underline"
                  href={merchant.data.presigned_personal_data_auth.permalink}
                  rel="noopener noreferrer"
                  target="_blank"
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
