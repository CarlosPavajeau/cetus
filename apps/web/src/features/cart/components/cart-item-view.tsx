import { getImageUrl } from '@cetus/shared/utils/image'
import { Currency } from '@cetus/web/components/currency'
import { type CartItem, useCart } from '@cetus/web/store/cart'
import {
  Cancel01Icon,
  MinusSignIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { Image } from '@unpic/react'

type Props = {
  item: CartItem
}

export function CartItemView({ item }: Props) {
  const { add, remove, reduce } = useCart()
  const { product, quantity } = item

  return (
    <div className="flex gap-4 py-5 first:pt-0">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
        <Image
          alt={product.name}
          className="object-cover"
          height={80}
          layout="fixed"
          src={getImageUrl(product.imageUrl)}
          width={80}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          className="truncate font-medium tracking-tight hover:underline"
          params={{ slug: product.slug }}
          search={{ variant: product.variantId }}
          to="/products/$slug"
        >
          {product.name}
        </Link>
        <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
          {product.optionValues.length > 0
            ? product.optionValues
                .map((v) => `${v.optionTypeName}: ${v.value}`)
                .join(' · ')
            : product.slug}
        </p>
        <p className="mt-0.5 font-bold">
          <Currency currency="COP" value={product.price * quantity} />
        </p>
        {item.quantity > 1 && (
          <p className="text-muted-foreground text-xs">
            <Currency currency="COP" value={product.price} /> c/u
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center rounded-xl border border-border bg-card">
          <button
            aria-label="Decrease quantity"
            className="flex h-8 w-8 items-center justify-center rounded-l-xl transition-colors hover:bg-muted"
            onClick={() => reduce(product)}
            type="button"
          >
            <HugeiconsIcon className="size-3" icon={MinusSignIcon} />
          </button>
          <span className="w-7 text-center font-mono text-sm tabular-nums">
            {item.quantity}
          </span>
          <button
            aria-label="Increase quantity"
            className="flex h-8 w-8 items-center justify-center rounded-r-xl transition-colors hover:bg-muted"
            onClick={() => add(product)}
            type="button"
          >
            <HugeiconsIcon className="size-3" icon={PlusSignIcon} />
          </button>
        </div>
        <button
          aria-label={`Remove ${product.name} from cart`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => remove(product)}
          type="button"
        >
          <HugeiconsIcon className="size-4" icon={Cancel01Icon} />
        </button>
      </div>
    </div>
  )
}
