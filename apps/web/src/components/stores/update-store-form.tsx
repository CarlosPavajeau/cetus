import { arktypeResolver } from '@hookform/resolvers/arktype'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { MailIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { updateStore } from '@/api/stores'
import { SubmitButton } from '@/components/submit-button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { UpdateStoreSchema } from '@/schemas/stores'
import { useTenantStore } from '@/store/use-tenant-store'

const updateStoreMutation = mutationOptions({
  mutationKey: ['stores', 'update'],
  mutationFn: updateStore,
})

export function UpdateStoreForm() {
  const { store } = useTenantStore()
  const form = useForm({
    resolver: arktypeResolver(UpdateStoreSchema),
    defaultValues: {
      id: store?.id,
      name: store?.name,
      address: store?.address,
      phone: store?.phone,
      email: store?.email,
      customDomain: store?.customDomain
        ? new URL(store?.customDomain).host
        : undefined,
    },
  })

  const { mutateAsync } = useMutation(updateStoreMutation)

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2.5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="peer pe-9"
                      placeholder="Email"
                      type="email"
                      {...field}
                    />
                    <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-muted-foreground/80 peer-disabled:opacity-50">
                      <MailIcon aria-hidden="true" size={16} />
                    </div>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customDomain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dominio personalizado</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="peer ps-16"
                      placeholder="google.com"
                      type="text"
                      {...field}
                    />
                    <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground text-sm peer-disabled:opacity-50">
                      https://
                    </span>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div>
          <SubmitButton
            disabled={form.formState.isSubmitting}
            isSubmitting={form.formState.isSubmitting}
          >
            Actualizar
          </SubmitButton>
        </div>
      </form>
    </Form>
  )
}
