import type { Product } from '@cetus/api-client/types/products'
import { updateProductSchema } from '@cetus/schemas/product.schema'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@cetus/ui/field'
import { Form } from '@cetus/ui/form'
import { Input } from '@cetus/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@cetus/ui/input-group'
import { Switch } from '@cetus/ui/switch'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { CategoryCombobox } from '@cetus/web/features/categories/components/category.combobox'
import { useUpdateProduct } from '@cetus/web/features/products/hooks/use-update-product'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { PackageIcon, RefreshCwIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'

type Props = {
  product: Product
}

export function UpdateProductForm({ product }: Readonly<Props>) {
  const form = useForm({
    resolver: arktypeResolver(updateProductSchema),
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
          <form id="update-product-form" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="name">Nombre</FieldLabel>
                      <Input id="name" type="text" {...field} />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <CategoryCombobox />
              </div>

              <Controller
                control={form.control}
                name="description"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="description">Descripción</FieldLabel>

                    <InputGroup>
                      <InputGroupTextarea
                        {...field}
                        value={field.value || ''}
                      />
                      <InputGroupAddon align="block-end">
                        <InputGroupText className="text-muted-foreground text-xs">
                          {field.value?.length || 0} caracteres
                        </InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="enabled"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="enabled">Estado</FieldLabel>
                    <div className="inline-flex items-center gap-2">
                      <Switch
                        aria-invalid={fieldState.invalid}
                        checked={field.value}
                        id="enabled"
                        name={field.name}
                        onCheckedChange={field.onChange}
                      />
                      <FieldDescription>
                        {field.value ? 'Activo' : 'Inactivo'}
                      </FieldDescription>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

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
            </FieldGroup>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
