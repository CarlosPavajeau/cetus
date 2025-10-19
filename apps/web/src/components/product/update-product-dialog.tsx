import { queryOptions, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchProduct, type Product } from '@/api/products'
import { UpdateProductForm } from '@/components/product/update-product-form'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  product: Product
}

const findProductQuery = (id: string, shouldFind: boolean) =>
  queryOptions({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
    enabled: shouldFind,
  })

export function UpdateProductDialog({ product }: Readonly<Props>) {
  const [isOpen, setIsOpen] = useState(false)
  const { isLoading, data } = useQuery(findProductQuery(product.id, isOpen))

  return (
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger asChild>
        <DropdownMenuItem
          aria-label="Edit product"
          onSelect={(e) => e.preventDefault()}
        >
          <span>Editar</span>
        </DropdownMenuItem>
      </SheetTrigger>

      <SheetContent
        aria-describedby={undefined}
        className="w-full overflow-auto pb-8 sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>Actualizar producto</SheetTitle>
        </SheetHeader>

        {isLoading && <FormSkeleton />}

        {!isLoading && data && <UpdateProductForm product={data} />}
      </SheetContent>
    </Sheet>
  )
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="mb-2 h-4 w-3/4 rounded bg-muted" />
      <Skeleton className="mb-2 h-4 w-full rounded bg-muted" />
      <Skeleton className="mb-2 h-4 w-5/6 rounded bg-muted" />
    </div>
  )
}
