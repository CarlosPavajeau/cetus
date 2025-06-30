import {
  COUPON_RULE_TYPE_OPTIONS,
  CouponRuleType,
  type CreateCouponRule,
} from '@/api/coupons'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useCategories } from '@/hooks/categories'
import { useProducts } from '@/hooks/products'
import { createCouponRuleSchema } from '@/schemas/coupons'
import { useOrganization } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm, useFormContext } from 'react-hook-form'
import type { TypeOf } from 'zod'

type Props = {
  onSuccess: (rule: CreateCouponRule) => void
}

export function AddCouponRule({ onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const form = useForm({
    resolver: zodResolver(createCouponRuleSchema),
    defaultValues: {
      ruleType: CouponRuleType.MinPurchaseAmount,
      value: '0',
    },
  })

  const onRuleTypeChange = (value: string) => {
    form.setValue('ruleType', Number(value))

    if (Number(value) === CouponRuleType.OnePerCustomer) {
      form.setValue('value', 'true')
      return
    }

    form.setValue('value', '')
  }

  const onSubmit = form.handleSubmit((data) => {
    onSuccess(data)
    setIsOpen(false)
  })

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <PlusIcon />
          Agregar regla
        </Button>
      </SheetTrigger>

      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Agregar regla</SheetTitle>
        </SheetHeader>

        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          <Form {...form}>
            <form onSubmit={onSubmit} className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="ruleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de regla</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => onRuleTypeChange(value)}
                        defaultValue={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo de regla" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUPON_RULE_TYPE_OPTIONS.map((option) => (
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

              <SelectRuleValue ruleType={form.watch('ruleType')} />

              <div className="w-full">
                <Button type="button" className="w-full" onClick={onSubmit}>
                  Agregar regla
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

type SelectRuleValueProps = {
  ruleType: CouponRuleType
}

function SelectRuleValue({ ruleType }: SelectRuleValueProps) {
  const form = useFormContext<TypeOf<typeof createCouponRuleSchema>>()

  if (ruleType === CouponRuleType.OnePerCustomer) {
    return null
  }

  if (ruleType === CouponRuleType.MinPurchaseAmount) {
    return (
      <FormField
        control={form.control}
        name="value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Valor</FormLabel>
            <FormControl>
              <Input placeholder="Valor" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  if (ruleType === CouponRuleType.SpecificCategory) {
    return <SelectRuleValueSpecificCategory />
  }

  if (ruleType === CouponRuleType.SpecificProduct) {
    return <SelectRuleValueSpecificProduct />
  }
}

function SelectRuleValueSpecificCategory() {
  const form = useFormContext<TypeOf<typeof createCouponRuleSchema>>()
  const org = useOrganization()
  const { categories } = useCategories(org.organization?.slug ?? undefined)

  return (
    <FormField
      control={form.control}
      name="value"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Categoría</FormLabel>
          <FormControl>
            <Select
              onValueChange={(value) => field.onChange(value)}
              defaultValue={field.value}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function SelectRuleValueSpecificProduct() {
  const form = useFormContext<TypeOf<typeof createCouponRuleSchema>>()
  const { products } = useProducts()

  return (
    <FormField
      control={form.control}
      name="value"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Producto</FormLabel>
          <FormControl>
            <Select
              onValueChange={(value) => field.onChange(value)}
              defaultValue={field.value}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
