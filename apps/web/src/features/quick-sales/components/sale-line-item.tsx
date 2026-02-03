import { getImageUrl } from '@cetus/shared/utils/image'
import { Currency } from '@cetus/web/components/currency'
import type { SelectedProductVariant } from '@cetus/web/features/quick-sales/components/product-search-inline'
import { Image } from '@unpic/react'
import { MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react'

type SaleLineItemProps = {
  product: SelectedProductVariant
  quantity: number
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

export function SaleLineItem({
  product,
  quantity,
  onQuantityChange,
  onRemove,
}: Readonly<SaleLineItemProps>) {
  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1)
    }
  }

  const handleIncrement = () => {
    if (quantity < product.stock) {
      onQuantityChange(quantity + 1)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex p-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
          <Image
            alt={product.name}
            className="object-cover"
            height={48}
            layout="constrained"
            objectFit="cover"
            sizes="48px"
            src={getImageUrl(product.imageUrl || 'placeholder.svg')}
            width={48}
          />
        </div>

        <div className="ml-3 flex flex-1 flex-col">
          <div className="flex justify-between">
            <h3 className="line-clamp-1 font-medium text-sm">{product.name}</h3>

            <button
              className="text-muted-foreground hover:text-red-500"
              onClick={onRemove}
              type="button"
            >
              <Trash2Icon className="h-4 w-4" />
              <span className="sr-only">Quitar producto</span>
            </button>
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            {product.optionValues.map((value) => (
              <span className="text-muted-foreground text-xs" key={value.id}>
                {value.optionTypeName}: {value.value}
              </span>
            ))}
          </div>

          <p className="text-muted-foreground text-xs">
            <Currency currency="COP" value={product.price} />
          </p>

          <div className="mt-auto flex items-center justify-between pt-1">
            <div className="flex items-center rounded-md border">
              <button
                className="p-1 text-muted-foreground disabled:opacity-50"
                disabled={quantity <= 1}
                onClick={handleDecrement}
                type="button"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm">{quantity}</span>
              <button
                className="p-1 text-muted-foreground disabled:opacity-50"
                disabled={quantity >= product.stock}
                onClick={handleIncrement}
                type="button"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            <span className="font-medium text-sm">
              <Currency currency="COP" value={product.price * quantity} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
