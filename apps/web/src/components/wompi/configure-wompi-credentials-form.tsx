import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { configureWompiCredentials } from '@/api/stores'
import { SubmitButton } from '@/components/submit-button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ConfigureWompiCredentialsSchema } from '@/schemas/stores'
import { useTenantStore } from '@/store/use-tenant-store'
import { HideableInput } from '../hideable-input'

export function ConfigureWompiCredentialsForm() {
  const { store, actions } = useTenantStore()
  const form = useForm({
    resolver: arktypeResolver(ConfigureWompiCredentialsSchema),
    defaultValues: {
      publicKey: store?.wompiPublicKey || '',
      privateKey: store?.wompiPrivateKey || '',
      eventsKey: store?.wompiEventsKey || '',
      integrityKey: store?.wompiIntegrityKey || '',
    },
  })

  const mutation = useMutation({
    mutationKey: ['stores', 'payment-providers', 'wompi', 'credentials'],
    mutationFn: configureWompiCredentials,
    onSuccess: async () => {
      toast.success('Configuración guardada', {
        description:
          'La configuración de Wompi ha sido actualizada correctamente.',
      })

      if (store) {
        await actions.fetchAndSetStore(store.slug)
      }
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutation.mutateAsync(data)
  })

  return (
    <form id="configure-wompi-credentials-form" onSubmit={handleSubmit}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="publicKey"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="public-key">Llave pública</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
                id="public-key"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="privateKey"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="private-key">Llave privada</FieldLabel>
              <HideableInput
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
                id="private-key"
                initialHidden={Boolean(store?.wompiPrivateKey)}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="eventsKey"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="events-key">Llave de eventos</FieldLabel>
              <HideableInput
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
                id="events-key"
                initialHidden={Boolean(store?.wompiEventsKey)}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="integrityKey"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="integrity-key">
                Llave de integridad
              </FieldLabel>
              <HideableInput
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
                id="integrity-key"
                initialHidden={Boolean(store?.wompiIntegrityKey)}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="pt-6">
        <SubmitButton
          disabled={form.formState.isSubmitting}
          isSubmitting={form.formState.isSubmitting}
        >
          Guardar
        </SubmitButton>
      </div>
    </form>
  )
}
