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
        <AlertTitle>¿Cómo conectar tu dominio?</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <p>
            Para conectar tu dominio personalizado, accede a la configuración
            DNS de tu proveedor de dominio y agrega los siguientes registros:
          </p>

          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground text-xs">
              Si usas un subdominio (ej: tienda.tudominio.com)
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono">CNAME</TableCell>
                  <TableCell className="font-mono">tienda</TableCell>
                  <TableCell className="font-mono">
                    cname.vercel-dns.com
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground text-xs">
              Si usas un dominio raíz (ej: tudominio.com)
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono">A</TableCell>
                  <TableCell className="font-mono">@</TableCell>
                  <TableCell className="font-mono">76.76.21.21</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="rounded-md bg-muted p-3 text-xs">
            <p className="mb-1 font-medium text-foreground">Pasos:</p>
            <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
              <li>Ingresa tu dominio en el campo de arriba y guárdalo.</li>
              <li>
                Accede al panel de tu proveedor de dominio (GoDaddy, Namecheap,
                Cloudflare, etc.).
              </li>
              <li>
                Agrega el registro DNS correspondiente según tu tipo de dominio.
              </li>
              <li>Espera la propagación DNS (puede tardar hasta 48 horas).</li>
              <li>
                El certificado SSL se generará automáticamente una vez
                verificado.
              </li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
