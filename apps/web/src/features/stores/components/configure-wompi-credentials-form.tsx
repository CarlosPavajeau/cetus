import { api } from '@cetus/api-client'
import { env } from '@cetus/env/client'
import { configureWompiCredentialsSchema } from '@cetus/schemas/store.schema'
import { Alert, AlertDescription, AlertTitle } from '@cetus/ui/alert'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import { CopiableInput } from '@cetus/web/components/copiable-input'
import { HideableInput } from '@cetus/web/components/hideable-input'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { SettingsIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

export function ConfigureWompiCredentialsForm() {
  const { store, actions } = useTenantStore()
  const form = useForm({
    resolver: arktypeResolver(configureWompiCredentialsSchema),
    defaultValues: {
      publicKey: store?.wompiPublicKey || '',
      privateKey: store?.wompiPrivateKey || '',
      eventsKey: store?.wompiEventsKey || '',
      integrityKey: store?.wompiIntegrityKey || '',
    },
  })

  const mutation = useMutation({
    mutationKey: ['stores', 'payment-providers', 'wompi', 'credentials'],
    mutationFn: api.stores.configureWompi,
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
        <Alert>
          <SettingsIcon />
          <AlertTitle>Configuración de Eventos</AlertTitle>
          <AlertDescription>
            <span>
              Asegurate de tener nuestra URL de eventos configurada
              correctamente en la plataforma de Wompi. Más información en la
              documentación oficial{' '}
              <a
                className="text-foreground underline"
                href="https://docs.wompi.co/docs/colombia/eventos/"
              >
                aquí.
              </a>
            </span>
            <div>
              <CopiableInput
                value={`${env.VITE_API_URL}/webhooks/wompi/payments`}
              />
            </div>
          </AlertDescription>
        </Alert>

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

        <div>
          <SubmitButton
            disabled={form.formState.isSubmitting}
            isSubmitting={form.formState.isSubmitting}
          >
            Guardar
          </SubmitButton>
        </div>
      </FieldGroup>
    </form>
  )
}
