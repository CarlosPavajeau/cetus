import type { CouponRuleType } from '@cetus/api-client/types/coupons'
import { createCouponRuleSchema } from '@cetus/schemas/coupon.schema'
import { couponRuleTypeLabels } from '@cetus/shared/constants/coupon'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@cetus/ui/sheet'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { productQueries } from '@cetus/web/features/products/queries'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm, useFormContext } from 'react-hook-form'

type CreateCouponRule = typeof createCouponRuleSchema.infer

type Props = {
  onSuccess: (rule: CreateCouponRule) => void
}

export function AddCouponRule({ onSuccess }: Readonly<Props>) {
  const [isOpen, setIsOpen] = useState(false)
  const form = useForm({
    resolver: arktypeResolver(createCouponRuleSchema),
    defaultValues: {
      ruleType: 'min_purchase_amount' as CouponRuleType,
      value: '0',
    },
  })

  const onRuleTypeChange = (value: CouponRuleType) => {
    form.setValue('ruleType', value)

    if (value === 'one_per_customer') {
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
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger asChild>
        <Button size="sm" type="button" variant="outline">
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
            <form className="flex flex-col gap-6" onSubmit={onSubmit}>
              <FormField
                control={form.control}
                name="ruleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de regla</FormLabel>
                    <FormControl>
                      <Select
                        defaultValue={field.value}
                        onValueChange={(value) =>
                          onRuleTypeChange(value as CouponRuleType)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo de regla" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(couponRuleTypeLabels).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
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

              <SelectRuleValue
                ruleType={form.watch('ruleType') as CouponRuleType}
              />

              <div className="w-full">
                <Button className="w-full" onClick={onSubmit} type="button">
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

function SelectRuleValue({ ruleType }: Readonly<SelectRuleValueProps>) {
  const form = useFormContext()

  if (ruleType === 'one_per_customer') {
    return null
  }

  if (ruleType === 'min_purchase_amount') {
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

  if (ruleType === 'specific_category') {
    return <SelectRuleValueSpecificCategory />
  }

  if (ruleType === 'specific_product') {
    return <SelectRuleValueSpecificProduct />
  }
}

function SelectRuleValueSpecificCategory() {
  const form = useFormContext()
  const { data: categories } = useCategories()

  return (
    <FormField
      control={form.control}
      name="value"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Categoría</FormLabel>
          <FormControl>
            <Select
              defaultValue={field.value}
              onValueChange={(value) => field.onChange(value)}
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
  const form = useFormContext()
  const { data: products } = useQuery(productQueries.list)

  return (
    <FormField
      control={form.control}
      name="value"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Producto</FormLabel>
          <FormControl>
            <Select
              defaultValue={field.value}
              onValueChange={(value) => field.onChange(value)}
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
