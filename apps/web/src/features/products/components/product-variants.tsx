import type {
  Product,
  ProductVariantResponse,
} from '@cetus/api-client/types/products'
import { getImageUrl } from '@cetus/shared/utils/image'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import { Currency } from '@cetus/web/components/currency'
import { TablePagination } from '@cetus/web/components/data-table/pagination'
import { DataTable } from '@cetus/web/components/data-table/table'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { AddProductVariantSheet } from '@cetus/web/features/products/components/add-product-variant-sheet'
import { productQueries } from '@cetus/web/features/products/queries'
import { useTableWithPagination } from '@cetus/web/hooks/use-table-with-pagination'
import { cn } from '@cetus/web/shared/utils'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Image } from '@unpic/react'
import { PackageIcon, SquarePenIcon } from 'lucide-react'

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
    id: 'sales-count',
    header: 'Ventas',
    accessorKey: 'salesCount',
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
      <Button asChild size="icon" variant="ghost">
        <Link
          params={{ id: row.original.id.toString() }}
          to="/app/products/variants/$id/edit"
        >
          <SquarePenIcon />
        </Link>
      </Button>
    ),
    size: 40,
  },
]

type Props = {
  product: Product
}

export function ProductVariants({ product }: Readonly<Props>) {
  const { isLoading, data, error } = useQuery(
    productQueries.variants.list(product.id),
  )

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
