import type { Product } from '@/api/products'
import { CategorySelector } from '@/components/category/category-selector'
import { SubmitButton } from '@/components/submit-button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateProduct } from '@/hooks/products/use-update-product'
import { UpdateProductSchema } from '@/schemas/product'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { PackageIcon, RefreshCwIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'

type Props = {
  product: Product
}

export function UpdateProductForm({ product }: Readonly<Props>) {
  const form = useForm({
    resolver: arktypeResolver(UpdateProductSchema),
    defaultValues: {
      ...product,
    },
  })

  const { mutateAsync } = useUpdateProduct()
  const handleSubmit = form.handleSubmit(
    async (values) => await mutateAsync(values),
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <PackageIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground">
              Información básica del producto
            </CardTitle>
            <CardDescription>
              Actualiza los detalles básicos sobre tu producto
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input autoFocus type="text" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <CategorySelector />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <div>
                      <div className="inline-flex items-center gap-2">
                        <Switch
                          aria-label="Toggle switch"
                          checked={field.value ?? false}
                          id={field.name}
                          onCheckedChange={field.onChange}
                        />
                        <FormLabel className="font-medium text-sm">
                          {field.value ? 'Activo' : 'Inactivo'}
                        </FormLabel>
                      </div>
                    </div>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-6">
              <div />

              <SubmitButton
                disabled={form.formState.isSubmitting}
                isSubmitting={form.formState.isSubmitting}
                type="submit"
              >
                <div className="flex items-center gap-2">
                  Actualizar
                  <RefreshCwIcon className="h-4 w-4" />
                </div>
              </SubmitButton>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
