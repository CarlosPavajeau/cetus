import type { ProductOptionValue } from '@cetus/api-client/types/products'
import { getImageUrl } from '@cetus/shared/utils/image'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@cetus/ui/command'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { Item, ItemContent, ItemMedia, ItemTitle } from '@cetus/ui/item'
import { Spinner } from '@cetus/ui/spinner'
import DialogContent, { Dialog } from '@cetus/web/components/ui/dialog'
import { productQueries } from '@cetus/web/features/products/queries'
import { DialogTitle } from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@uidotdev/usehooks'
import { Image } from '@unpic/react'
import { CommandLoading } from 'cmdk'
import { BookDashedIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'

export type SelectedProductVariant = {
  id: number
  name: string
  sku: string
  imageUrl?: string
  stock: number
  optionValues: ProductOptionValue[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (selected: SelectedProductVariant) => void
}

export function SearchProductsDialog({
  open,
  onOpenChange,
  onSelect,
}: Readonly<Props>) {
  const [searchTermState, setSearchTermState] = useState('')
  const searchTerm = useDebounce(searchTermState, 200)

  const { data, isFetching } = useQuery(productQueries.search(searchTerm))

  const handleSelect = (productId: string, variantId: number) => {
    const product = data?.find((p) => p.id === productId)
    const variant = product?.variants.find((v) => v.id === variantId)

    if (product && variant) {
      onSelect({
        id: variant.id,
        name: product.name,
        sku: variant.sku,
        imageUrl: variant.imageUrl,
        stock: variant.stock,
        optionValues: variant.optionValues,
      })
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <DialogTitle className="hidden" />
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setSearchTermState}
            placeholder="Digite el nombre del producto"
          />

          <CommandList>
            {!isFetching && data === undefined && (
              <CommandEmpty>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchIcon />
                    </EmptyMedia>
                    <EmptyTitle>Busca productos por nombre</EmptyTitle>
                    <EmptyDescription>
                      Empieza a escribir para ver resultados.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CommandEmpty>
            )}

            {!isFetching && data?.length === 0 && (
              <CommandEmpty>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BookDashedIcon />
                    </EmptyMedia>
                    <EmptyTitle>No se encontraron productos</EmptyTitle>
                    <EmptyDescription>
                      Intenta con otro término de búsqueda.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CommandEmpty>
            )}

            {isFetching && (
              <CommandLoading>
                <Empty className="w-full">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Spinner />
                    </EmptyMedia>
                    <EmptyTitle>Buscando productos...</EmptyTitle>
                    <EmptyDescription>
                      Por favor espera un momento.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CommandLoading>
            )}

            {data?.map((product) => (
              <CommandGroup heading={product.name} key={product.id}>
                {product.variants.map((variant) => (
                  <CommandItem
                    key={variant.id}
                    onSelect={() => handleSelect(product.id, variant.id)}
                    value={variant.sku}
                  >
                    <Item
                      className="w-full p-0"
                      key={variant.sku}
                      role="listitem"
                      size="sm"
                    >
                      <ItemMedia className="size-20" variant="image">
                        <Image
                          alt={variant.sku}
                          className="object-cover"
                          height={128}
                          layout="constrained"
                          objectFit="cover"
                          src={getImageUrl(
                            variant.imageUrl || 'placeholder.svg',
                          )}
                          width={128}
                        />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="line-clamp-1">
                          {product.name}
                        </ItemTitle>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {variant.optionValues.map((value) => (
                              <span
                                className="text-muted-foreground text-xs"
                                key={value.id}
                              >
                                {value.optionTypeName}: {value.value}
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <span className="text-xs">
                              Stock: {variant.stock}
                            </span>
                          </div>
                        </div>
                      </ItemContent>
                    </Item>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
