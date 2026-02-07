import { api } from '@cetus/api-client'
import type { UpdateStoreValues } from '@cetus/api-client/types/stores'
import { updateStoreSchema } from '@cetus/schemas/store.schema'
import { Alert, AlertDescription, AlertTitle } from '@cetus/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@cetus/ui/form'
import { Input } from '@cetus/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cetus/ui/table'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { InfoIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'

export function CustomDomainSection() {
  const { store } = useTenantStore()
  const form = useForm({
    resolver: arktypeResolver(updateStoreSchema),
    defaultValues: {
      id: store?.id,
      name: store?.name,
      customDomain: store?.customDomain
        ? new URL(store?.customDomain).host
        : undefined,
    },
  })

  const { mutateAsync } = useMutation({
    mutationKey: ['stores', 'update'],
    mutationFn: (data: UpdateStoreValues) =>
      api.stores.update(store?.id ?? '', data),
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  return (
    <div className="flex flex-col gap-4">
      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
                      placeholder="mitienda.com"
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

          <div>
            <SubmitButton
              disabled={form.formState.isSubmitting}
              isSubmitting={form.formState.isSubmitting}
            >
              Guardar dominio
            </SubmitButton>
          </div>
        </form>
      </Form>

      <Alert>
        <InfoIcon className="size-4" />
        <AlertTitle>Configuración DNS</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <p>
            Para conectar tu dominio personalizado, agrega el siguiente registro
            DNS en tu proveedor de dominio:
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono">CNAME</TableCell>
                <TableCell className="font-mono">@</TableCell>
                <TableCell className="font-mono">cetus.app</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <p className="text-muted-foreground text-xs">
            Los cambios de DNS pueden tardar hasta 48 horas en propagarse.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
