import type { Order } from '@/api/orders'
import {
  type CreateTransactionRequest,
  createPSETransaction,
} from '@/api/third-party/wompi'
import { useFinancialInstitutions } from '@/hooks/use-financial-institutions'
import { valueToCents } from '@/shared/currency'
import { useGenerateIntegritySignature } from '@/shared/wompi'
import { useMutation } from '@tanstack/react-query'
import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { PaymentConsent } from './payment-consent'
import type { PaymentFormValues } from './payment-options'
import { Button } from './ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

type Props = {
  order: Order
}

export const PsePaymentForm = ({ order }: Props) => {
  const amount = valueToCents(order.total)
  const reference = order.id
  const integritySecret = import.meta.env.PUBLIC_WOMPI_INTEGRITY_SECRET
  const redirect = window.location.origin + `/orders/${order.id}/confirmation`

  const { isLoading, signature } = useGenerateIntegritySignature(
    reference,
    amount,
    integritySecret,
  )

  const createTransactionMutation = useMutation({
    mutationKey: ['create-transaction', order.id],
    mutationFn: createPSETransaction,
  })

  const form = useFormContext<PaymentFormValues>()

  const onSubmit = form.handleSubmit((values) => {
    if (values.type !== 'PSE') return

    const createTransactionRequest = {
      acceptance_token: values.acceptance_token,
      amount_in_cents: valueToCents(order.total),
      currency: 'COP',
      signature: signature ?? '',
      customer_email: order.customer.email,
      payment_method: {
        type: 'PSE',
        user_type: values.user_type,
        user_legal_id_type: values.user_legal_id_type,
        user_legal_id: values.user_legal_id,
        financial_institution_code: values.financial_institution_code,
        payment_description: `Pago de ${order.total}`,
      },
      redirect_url: redirect,
      reference: order.id,
      customer_data: {
        phone_number: order.customer.phone,
        full_name: order.customer.name,
      },
    } satisfies CreateTransactionRequest

    createTransactionMutation.mutate(createTransactionRequest)
  })

  useEffect(() => {
    if (createTransactionMutation.isSuccess) {
      const url = createTransactionMutation.data

      window.open(url, '_self')
    }
  }, [createTransactionMutation])

  const { financialInstitutions, isLoading: isLoadingFinancialInstitutions } =
    useFinancialInstitutions()

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="financial_institution_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banco</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoadingFinancialInstitutions}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {financialInstitutions?.map((institution) => (
                      <SelectItem
                        key={institution.financial_institution_code}
                        value={institution.financial_institution_code}
                      >
                        {institution.financial_institution_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="user_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de persona</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoadingFinancialInstitutions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Natural</SelectItem>
                      <SelectItem value="1">Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_legal_id_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de documento</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoadingFinancialInstitutions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Cédula de ciudadanía</SelectItem>
                      <SelectItem value="NIT">NIT</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="user_legal_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de documento</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  disabled={isLoadingFinancialInstitutions}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <PaymentConsent />

      <Button
        size="lg"
        className="group w-full"
        disabled={isLoading || createTransactionMutation.isPending}
      >
        {createTransactionMutation.isPending && (
          <LoaderCircleIcon
            className="animate-spin"
            size={16}
            aria-hidden="true"
          />
        )}
        Pagar con PSE
        <ArrowRightIcon
          className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
          size={16}
          aria-hidden="true"
        />
      </Button>
    </form>
  )
}
