import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@cetus/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import { Badge } from '@cetus/web/components/ui/badge'
import { Button } from '@cetus/web/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/web/components/ui/empty'
import { Input } from '@cetus/web/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cetus/web/components/ui/table'
import { createFileRoute } from '@tanstack/react-router'
import {
  PackageIcon,
  SaveIcon,
  ScanBarcodeIcon,
  SearchIcon,
} from 'lucide-react'

export const Route = createFileRoute('/app/inventory/adjustment')({
  component: RouteComponent,
})

function RouteComponent() {
  const isEmpty = false

  return (
    <div>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <div className="sticky top-0 z-10 space-y-4 py-4 backdrop-blur-md">
          <div className="relative w-full flex-1">
            <div className="flex items-center gap-3">
              <InputGroup className="w-full">
                <InputGroupInput placeholder="Buscar..." />
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </div>

        {isEmpty && (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScanBarcodeIcon />
              </EmptyMedia>
              <EmptyTitle>Sin ajustes de inventario</EmptyTitle>
              <EmptyDescription>
                No se han agregado ajustes de inventario.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        <main className="mx-auto w-full flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-sm">
              Productos agregados{' '}
              <Badge shape="circle" variant="secondary">
                0
              </Badge>
            </h2>
            <Button appearance="ghost" size="sm" variant="destructive">
              Descartar ajuste
            </Button>
          </div>

          <div className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Stock actual</TableHead>
                  <TableHead>Operacion</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Nueva cantidad</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                <TableRow>
                  <TableCell>Todos</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar operación" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="delta">
                            Agregar / Remover
                          </SelectItem>
                          <SelectItem value="snapshot">
                            Establecer cantidad
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input defaultValue={0} type="number" />
                  </TableCell>
                  <TableCell className="text-right">0</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </main>

        <div className="sticky bottom-0 z-20 border-t py-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <PackageIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{0} item modified</span>
                <span className="text-muted-foreground text-xs">
                  {0} items in batch
                </span>
              </div>
            </div>

            <div className="flex w-full items-center gap-3 sm:w-auto">
              <Button>
                <SaveIcon className="h-4 w-4" />
                Aplicar ajustes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
