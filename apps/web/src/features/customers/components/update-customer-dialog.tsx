import { api } from '@cetus/api-client'
import type { Customer } from '@cetus/api-client/types/customers'
import { updateCustomerSchema } from '@cetus/schemas/customer.schema'
import { documentTypes } from '@cetus/shared/constants/customer'
import { Button } from '@cetus/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@cetus/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@cetus/web/components/ui/field'
import { Input } from '@cetus/web/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/web/components/ui/select'
import { Spinner } from '@cetus/web/components/ui/spinner'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { PencilEdit02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { customerQueries } from '../queries'

type Props = {
  customer: Customer
}

export function UpdateCustomerDialog({ customer }: Props) {
  const [open, setOpen] = useState(false)
  const form = useForm({
    resolver: arktypeResolver(updateCustomerSchema),
    defaultValues: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      id: customer.id,
      documentType: customer.documentType,
      documentNumber: customer.documentNumber,
    },
  })

  const queryClient = useQueryClient()
  const { mutateAsync } = useMutation({
    mutationKey: ['customers', customer.id, 'update'],
    mutationFn: api.customers.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries(customerQueries.detail(customer.id))

      toast.success('Cliente actualizado correctamente')
      setOpen(false)
    },
    onError: (error) => {
      toast.error(`Error al actualizar el cliente: ${error.message}`)
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  const handleOpenChange = (next: boolean) => {
    if (next) {
      form.reset({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        id: customer.id,
        documentType: customer.documentType,
        documentNumber: customer.documentNumber,
      })
    }
    setOpen(next)
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <HugeiconsIcon icon={PencilEdit02Icon} />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Actualizar cliente</DialogTitle>
          </DialogHeader>

          <FieldGroup>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Nombre</FieldLabel>
                  <Input {...field} />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Teléfono</FieldLabel>
                  <Input {...field} />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Email</FieldLabel>
                  <Input {...field} />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="documentType"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Tipo de documento</FieldLabel>

                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de documento" />
                    </SelectTrigger>

                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="documentNumber"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Número de documento</FieldLabel>
                  <Input {...field} />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={form.formState.isSubmitting} variant="outline">
                Cancelar
              </Button>
            </DialogClose>

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting && <Spinner />}
              Actualizar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
