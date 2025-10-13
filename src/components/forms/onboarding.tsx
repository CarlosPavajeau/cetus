import { createStore } from '@/api/stores'
import { authClient } from '@/auth/auth-client'
import { SubmitButton } from '@/components/submit-button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useNavigate } from '@tanstack/react-router'
import { type } from 'arktype'
import { ArrowRightIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const CreateOrganizationSchema = type({
  name: type.string,
  slug: type.string.matching(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
})

export function OnBoardingForm() {
  const form = useForm({
    resolver: arktypeResolver(CreateOrganizationSchema),
  })
  const navigate = useNavigate()

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

    await createStore({
      name: organization.name,
      slug: organization.slug,
      externalId: organization.id,
    })

    navigate({
      to: '/onboarding/mercado-pago/link',
      reloadDocument: true,
    })
  })

  const name = form.watch('name')
  useEffect(() => {
    form.setValue('slug', name?.toLowerCase().replace(/\s+/g, '-'))
  }, [name])

  return (
    <Form {...form}>
      <form className="flex flex-col space-y-4" onSubmit={onSubmit}>
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
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <SubmitButton
          disabled={!form.formState.isDirty}
          isSubmitting={form.formState.isSubmitting}
        >
          <div className="group flex w-full items-center space-x-2">
            <span>Registrar datos</span>
            <ArrowRightIcon
              aria-hidden="true"
              className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
              size={16}
            />
          </div>
        </SubmitButton>
      </form>
    </Form>
  )
}
