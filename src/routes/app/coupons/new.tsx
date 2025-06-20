import { COUPON_DISCOUNT_TYPE_OPTIONS } from '@/api/coupons'
import { AccessDenied } from '@/components/access-denied'
import { CouponRulesForm } from '@/components/coupons/coupon-rules.form'
import { ReturnButton } from '@/components/return-button'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateCoupon } from '@/hooks/coupons'
import { createCouponSchema } from '@/schemas/coupons'
import { generateCouponCode } from '@/shared/coupons'
import { Protect } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
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
    resolver: zodResolver(createCouponSchema),
    defaultValues: {
      rules: [],
    },
  })

  const createCouponMutation = useCreateCoupon({
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

  const onDiscountTypeChange = (value: string) => {
    form.setValue('discountType', Number(value))
  }

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="flex flex-col gap-4">
        <h1 className="font-heading font-semibold text-2xl">Crear cupón</h1>

        <div>
          <ReturnButton />
        </div>

        <Form {...form}>
          <form
            onSubmit={onSubmit}
            className="space-y-8 rounded-md border border-muted bg-card p-4 md:p-8"
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
                            variant="outline"
                            type="button"
                            size="icon"
                            onClick={generateCode}
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
                          onValueChange={onDiscountTypeChange}
                          defaultValue={field.value?.toString()}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo de descuento" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUPON_DISCOUNT_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value.toString()}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
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
                  <Button type="submit" className="w-full">
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
    </Protect>
  )
}
