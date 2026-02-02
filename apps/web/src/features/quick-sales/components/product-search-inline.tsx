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
import { Currency } from '@cetus/web/components/currency'
import { productQueries } from '@cetus/web/features/products/queries'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@uidotdev/usehooks'
import { Image } from '@unpic/react'
import { CommandLoading } from 'cmdk'
import { AlertTriangleIcon, BookDashedIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'

export type SelectedProductVariant = {
  id: number
  name: string
  sku: string
  imageUrl?: string
  stock: number
  price: number
  optionValues: ProductOptionValue[]
}

type Props = {
  onSelect: (selected: SelectedProductVariant) => void
}

export function ProductSearchInline({ onSelect }: Readonly<Props>) {
  const [searchTermState, setSearchTermState] = useState('')
  const searchTerm = useDebounce(searchTermState, 200)

  const { data, isFetching, isError, error } = useQuery(
    productQueries.search(searchTerm),
  )

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
        price: variant.price,
        optionValues: variant.optionValues,
      })
    }
  }

  return (
    <Command className="rounded-lg border" shouldFilter={false}>
      <CommandInput
        onValueChange={setSearchTermState}
        placeholder="Buscar producto..."
      />

      <CommandList>
        {!isFetching && data === undefined && !isError && (
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

        {isError && (
          <CommandEmpty>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <AlertTriangleIcon />
                </EmptyMedia>
                <EmptyTitle>Error al buscar productos</EmptyTitle>
                <EmptyDescription>
                  {error instanceof Error
                    ? error.message
                    : 'Intenta de nuevo más tarde.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CommandEmpty>
        )}

        {!isFetching && data?.length === 0 && !isError && (
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

        {isFetching && !isError && (
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

        {!(isFetching || isError) &&
          data?.map((product) => (
            <CommandGroup heading={product.name} key={product.id}>
              {product.variants.map((variant) => (
                <CommandItem
                  key={variant.id}
                  onSelect={() => handleSelect(product.id, variant.id)}
                  value={variant.sku}
                >
                  <Item className="w-full p-0" role="listitem" size="sm">
                    <ItemMedia className="size-12" variant="image">
                      <Image
                        alt={product.name}
                        className="object-cover"
                        height={48}
                        layout="constrained"
                        objectFit="cover"
                        src={getImageUrl(variant.imageUrl || 'placeholder.svg')}
                        width={48}
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="line-clamp-1">
                        {product.name}
                      </ItemTitle>

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

                      <div className="flex items-center gap-2">
                        <span className="text-xs">Stock: {variant.stock}</span>
                        <span className="font-medium text-xs">
                          <Currency currency="COP" value={variant.price} />
                        </span>
                      </div>
                    </ItemContent>
                  </Item>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
      </CommandList>
    </Command>
  )
}
