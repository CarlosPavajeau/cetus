import type { Order } from '@/api/orders'
import { useFinancialInstitutions } from '@/hooks/use-financial-institutions'
import type { PaymentFormValues } from '@/schemas/payments'
import { useFormContext } from 'react-hook-form'
import { BasePaymentForm } from './base-payment-form'
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
  const { financialInstitutions, isLoading: isLoadingFinancialInstitutions } =
    useFinancialInstitutions()

  const form = useFormContext<PaymentFormValues>()

  return (
    <BasePaymentForm order={order} buttonText="Pagar con PSE">
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
    </BasePaymentForm>
  )
}
