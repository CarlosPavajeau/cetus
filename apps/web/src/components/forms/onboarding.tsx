import { api } from '@cetus/api-client'
import { authClient } from '@cetus/auth/client'
import { Button } from '@cetus/ui/button'
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
  InputGroupInput,
  InputGroupText,
} from '@cetus/ui/input-group'
import { Spinner } from '@cetus/ui/spinner'
import { toSlug } from '@cetus/web/lib/to-slug'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { type } from 'arktype'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

const CreateOrganizationSchema = type({
  name: type.string,
  slug: type.string.matching(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
})

type Props = {
  onSuccess: () => void
}

export function OnBoardingForm({ onSuccess }: Props) {
  const form = useForm({
    resolver: arktypeResolver(CreateOrganizationSchema),
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await authClient.organization.create(values)

    if (result.error) {
      toast.error('Ha ocurrido un error al crear la tienda', {
        description: result.error.message,
      })
      return
    }

    const organization = result.data
    await authClient.organization.setActive({
      organizationId: organization.id,
    })

    await api.stores.create({
      name: organization.name,
      slug: organization.slug,
      externalId: organization.id,
    })

    onSuccess()
  })

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Nombre de la tienda</FieldLabel>
                <Input
                  {...field}
                  autoComplete="off"
                  onChange={(e) => {
                    field.onChange(e)
                    form.setValue('slug', toSlug(e.target.value), {
                      shouldValidate: form.formState.isSubmitted,
                    })
                  }}
                />
                {fieldState.error && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="slug"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Slug</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <InputGroupText>/</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                </InputGroup>
                <FieldDescription>
                  Identifica tu tienda en la URL. Solo letras, números y
                  guiones.
                </FieldDescription>
                {fieldState.error && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          <Button
            className="w-full"
            disabled={form.formState.isSubmitting}
            size="lg"
            type="submit"
          >
            {form.formState.isSubmitting ? (
              <>
                <Spinner />
                Registrando...
              </>
            ) : (
              'Registrar datos'
            )}
          </Button>
        </FieldGroup>
      </form>
    </Form>
  )
}
