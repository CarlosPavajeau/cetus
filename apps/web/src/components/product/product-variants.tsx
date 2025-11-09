import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Image } from '@unpic/react'
import { PackageIcon, SquarePenIcon } from 'lucide-react'
import {
  fetchProductVariants,
  type Product,
  type ProductVariantResponse,
} from '@/api/products'
import { Currency } from '@/components/currency'
import { TablePagination } from '@/components/data-table/pagination'
import { DataTable } from '@/components/data-table/table'
import { DefaultLoader } from '@/components/default-loader'
import { AddProductVariantSheet } from '@/components/product/add-product-variant-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTableWithPagination } from '@/hooks/use-table-with-pagination'
import { getImageUrl } from '@/shared/cdn'
import { cn } from '@/shared/cn'

const columns: ColumnDef<ProductVariantResponse>[] = [
  {
    id: 'image',
    cell: ({ row }) => (
      <Image
        alt={row.original.sku}
        className="rounded-md"
        height={48}
        src={getImageUrl(
          row.original.images.at(0)?.imageUrl || 'placeholder.svg',
        )}
        width={48}
      />
    ),
    size: 48,
  },
  {
    id: 'sku',
    header: 'SKU',
    cell: ({ row }) => <Badge variant="outline">{row.original.sku}</Badge>,
    size: 150,
  },
  {
    id: 'options',
    header: 'Opciones',
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-2">
        {row.original.optionValues.map((value) => (
          <Badge key={value.id}>
            {value.optionTypeName}: {value.value}
          </Badge>
        ))}
      </div>
    ),
    size: 150,
  },
  {
    id: 'price',
    header: 'Precio',
    cell: ({ row }) => <Currency currency="COP" value={row.original.price} />,
    size: 60,
  },
  {
    id: 'stock',
    header: 'Stock',
    accessorKey: 'stock',
    size: 60,
  },
  {
    id: 'enabled',
    header: 'Estado',
    cell: ({ row }) => (
      <Badge
        className={cn(
          !row.original.enabled &&
            'bg-muted-foreground/60 text-primary-foreground',
        )}
      >
        {row.original.enabled ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
    size: 60,
  },
  {
    id: 'featured',
    header: 'Destacado',
    cell: ({ row }) => <Badge>{row.original.featured ? 'Si' : 'No'}</Badge>,
    size: 60,
  },
  {
    id: 'edit',
    cell: ({ row }) => (
      <Button asChild size="icon-lg" variant="ghost">
        <Link
          params={{ id: row.original.id.toString() }}
          to="/app/products/variants/$id/edit"
        >
          <SquarePenIcon />
        </Link>
      </Button>
    ),
    size: 60,
  },
]

type Props = {
  product: Product
}

export function ProductVariants({ product }: Readonly<Props>) {
  const { isLoading, data, error } = useQuery({
    queryKey: ['products', 'variants', product.id],
    queryFn: () => fetchProductVariants(product.id),
  })

  const { table, paginationInfo } = useTableWithPagination(columns, data || [])

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <DefaultLoader />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-destructive text-sm">
            Error al cargar las variantes del producto
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <PackageIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Variantes del producto</CardTitle>
              <CardDescription>
                Actualiza las variantes del producto
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Este producto no tiene variantes configuradas
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <PackageIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Variantes del producto</CardTitle>
            <CardDescription>
              Actualiza las variantes del producto
            </CardDescription>
          </div>
        </div>

        <CardAction>
          <AddProductVariantSheet product={product} />
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <DataTable table={table} />
          <TablePagination paginationInfo={paginationInfo} table={table} />
        </div>
      </CardContent>
    </Card>
  )
}
