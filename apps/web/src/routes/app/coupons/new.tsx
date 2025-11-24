import { api } from '@cetus/api-client'
import type { CouponDiscountType } from '@cetus/api-client/types/coupons'
import { createCouponSchema } from '@cetus/schemas/coupon.schema'
import { couponDiscountTypeLabels } from '@cetus/shared/constants/coupon'
import { generateCouponCode } from '@cetus/shared/utils/coupon-code-generator'
import { Button } from '@cetus/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cetus/ui/form'
import { Input } from '@cetus/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import { Textarea } from '@cetus/ui/textarea'
import { ReturnButton } from '@cetus/web/components/return-button'
import { CouponRulesForm } from '@cetus/web/features/coupons/components/coupon-rules.form'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2Icon, RefreshCcwIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/coupons/new')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate({ from: '/app/coupons/new' })
  const form = useForm({
    resolver: arktypeResolver(createCouponSchema),
    defaultValues: {
      rules: [],
    },
  })

  const createCouponMutation = useMutation({
    mutationKey: ['coupons', 'create'],
    mutationFn: api.coupons.create,
    onSuccess: () => {
      toast.success('Cupón creado correctamente')
      navigate({ to: '/app/coupons' })
      form.reset()
    },
  })

  const onSubmit = form.handleSubmit((data) => {
    createCouponMutation.mutate(data)
  })

  const generateCode = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2)
    const code = generateCouponCode({
      length: 10,
      suffix: currentYear,
    })
    form.setValue('code', code)
  }

  const onDiscountTypeChange = (value: CouponDiscountType) => {
    form.setValue('discountType', value)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-heading font-semibold text-2xl">Crear cupón</h1>

      <div>
        <ReturnButton />
      </div>

      <Form {...form}>
        <form
          className="space-y-8 rounded-md border border-muted bg-card p-4 md:p-8"
          onSubmit={onSubmit}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input placeholder="Código del cupón" {...field} />
                        <Button
                          onClick={generateCode}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <RefreshCcwIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción del cupón"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de descuento</FormLabel>
                    <FormControl>
                      <Select
                        defaultValue={field.value?.toString()}
                        onValueChange={onDiscountTypeChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo de descuento" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(couponDiscountTypeLabels).map(
                            ([key, value]) => (
                              <SelectItem key={key} value={key}>
                                {value}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor del descuento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Valor del descuento"
                        {...field}
                        type="number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="usageLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Límite de usos</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Límite de usos"
                        {...field}
                        type="number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-col gap-6">
              <CouponRulesForm />

              <div className="w-full">
                <Button className="w-full" type="submit">
                  {createCouponMutation.isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    'Crear cupón'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
