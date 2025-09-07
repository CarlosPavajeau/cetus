import type { ProductForSale, ProductVariantResponse } from '@/api/products'
import { Currency } from '@/components/currency'
import { ProductAddedNotification } from '@/components/product/product-added-notification'
import { ProductImages } from '@/components/product/product-images'
import { ProductRating } from '@/components/product/product-rating'
import { ProductShare } from '@/components/product/product-share'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCart } from '@/store/cart'
import { Link } from '@tanstack/react-router'
import { MinusIcon, PlusIcon, ShoppingCartIcon } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

type OptionGroup = {
  optionTypeName: string
  optionTypeId: number
  values: Array<{
    id: number
    value: string
    variantId: number
    isAvailable: boolean
  }>
}

// Helper function to group option values by type
function createOptionGroups(
  variants: ProductForSale['variants'],
): OptionGroup[] {
  const groups = new Map<number, OptionGroup>()

  for (const variant of variants) {
    for (const optionValue of variant.optionValues) {
      if (!groups.has(optionValue.optionTypeId)) {
        groups.set(optionValue.optionTypeId, {
          optionTypeName: optionValue.optionTypeName,
          optionTypeId: optionValue.optionTypeId,
          values: [],
        })
      }

      const group = groups.get(optionValue.optionTypeId)
      if (!group) {
        continue
      }

      const existingValue = group.values.find((v) => v.id === optionValue.id)

      if (existingValue) {
        // Aggregate availability across all variants that include this value
        existingValue.isAvailable =
          existingValue.isAvailable || variant.stock > 0
      } else {
        group.values.push({
          id: optionValue.id,
          value: optionValue.value,
          variantId: variant.id,
          isAvailable: variant.stock > 0,
        })
      }
    }
  }

  return Array.from(groups.values())
}

type ProductOptionsProps = {
  product: ProductForSale
  currentVariantId: number
}

const ProductOptions = memo(
  ({ product, currentVariantId }: Readonly<ProductOptionsProps>) => {
    // Group option values by option type
    const optionGroups = useMemo(
      () => createOptionGroups(product.variants),
      [product.variants],
    )

    // Get current variant's option values
    const currentVariant = product.variants.find(
      (v) => v.id === currentVariantId,
    )
    const currentOptionValues = currentVariant?.optionValues || []

    // Find compatible variant when an option is selected
    const findCompatibleVariant = useCallback(
      (selectedOptionId: number) => {
        const selectedOption = optionGroups
          .flatMap((group) => group.values)
          .find((value) => value.id === selectedOptionId)

        if (!selectedOption) {
          return currentVariantId
        }

        // Get the option type of the selected option
        const selectedOptionType = optionGroups.find((group) =>
          group.values.some((value) => value.id === selectedOptionId),
        )

        if (!selectedOptionType) {
          return currentVariantId
        }

        // Find other selected options (from different option types)
        const otherSelectedOptions = currentOptionValues.filter(
          (optionValue) =>
            optionValue.optionTypeId !== selectedOptionType.optionTypeId,
        )

        // Find variant that matches the selected option + other selected options
        const compatibleVariant = product.variants.find((variant) => {
          const hasSelectedOption = variant.optionValues.some(
            (optionValue) => optionValue.id === selectedOptionId,
          )

          const hasOtherOptions = otherSelectedOptions.every((otherOption) =>
            variant.optionValues.some(
              (optionValue) => optionValue.id === otherOption.id,
            ),
          )

          return hasSelectedOption && hasOtherOptions && variant.stock > 0
        })

        return (
          compatibleVariant?.id ??
          product.variants.find(
            (v) =>
              v.optionValues.some((ov) => ov.id === selectedOptionId) &&
              v.stock > 0,
          )?.id ??
          selectedOption.variantId
        )
      },
      [currentVariantId, currentOptionValues, optionGroups, product.variants],
    )

    if (optionGroups.length === 0) {
      return null
    }

    return (
      <div className="space-y-4">
        {optionGroups.map((group) => (
          <div className="flex flex-col gap-2" key={group.optionTypeId}>
            <Label>{group.optionTypeName}:</Label>
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => {
                const isSelected = currentOptionValues.some(
                  (optionValue) => optionValue.id === value.id,
                )

                return (
                  <div
                    className="flex flex-col items-center gap-1"
                    key={value.id}
                  >
                    {value.isAvailable && !isSelected ? (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          replace
                          search={{ variant: findCompatibleVariant(value.id) }}
                          to="."
                        >
                          {value.value}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        aria-disabled
                        className="disabled:opacity-100"
                        disabled
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                      >
                        {value.value}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  },
)

type QuantitySelectorProps = {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  max?: number
}

const QuantitySelector = memo(
  ({
    quantity,
    onIncrement,
    onDecrement,
    max = Number.POSITIVE_INFINITY,
  }: Readonly<QuantitySelectorProps>) => {
    const isMaxReached = max !== Number.POSITIVE_INFINITY && quantity >= max

    return (
      <div className="flex items-center">
        <Label className="mr-2">Cantidad:</Label>
        <div className="flex items-center rounded-md border border-input">
          <button
            className="p-2 text-muted-foreground"
            disabled={quantity <= 1}
            onClick={onDecrement}
            type="button"
          >
            <MinusIcon className="h-4 w-4" />
          </button>
          <span className="px-4">{quantity}</span>
          <button
            className="p-2 text-muted-foreground"
            disabled={isMaxReached}
            onClick={onIncrement}
            type="button"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        {isMaxReached && (
          <span className="ml-4 text-red-500 text-sm">
            Máximo: {max} unidades
          </span>
        )}
      </div>
    )
  },
)

type Props = {
  product: ProductForSale
  variant: ProductVariantResponse
}

function ProductDisplayComponent({ product, variant }: Readonly<Props>) {
  const cart = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  const incrementQuantity = useCallback(() => {
    setQuantity((prev) => prev + 1)
  }, [])

  const decrementQuantity = useCallback(() => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1))
  }, [])

  const handleAddToCart = useCallback(() => {
    setIsAddingToCart(true)

    // Simulate a small delay for better UX
    setTimeout(() => {
      const success = cart.add(
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: variant.images[0].imageUrl,
          price: variant.price,
          variantId: variant.id,
        },
        quantity,
      )
      setIsAddingToCart(false)

      if (!success) {
        toast.error('No hay suficiente stock')
        return
      }

      toast.custom((t) => (
        <ProductAddedNotification
          onClose={() => toast.dismiss(t)}
          productName={product.name}
        />
      ))
    }, 300)
  }, [cart, product, quantity, variant])

  const isOutOfStock = variant.stock <= 0

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ProductImages images={variant.images} />

      <div className="space-y-6">
        <div>
          <h1 className="mb-2 font-bold font-heading text-2xl lg:text-3xl">
            {product.name}
          </h1>

          <div className="mb-4 font-bold text-3xl">
            <Currency currency="COP" value={variant.price} />
          </div>

          <div className="mb-4 flex items-center space-x-2">
            <ProductRating
              rating={product.rating}
              reviewsCount={product.reviewsCount}
            />
          </div>
        </div>

        <div className="text-muted-foreground leading-relaxed">
          <p>{product.description}</p>
        </div>

        <ProductOptions currentVariantId={variant.id} product={product} />

        <div className="space-y-4">
          <div>
            <QuantitySelector
              max={variant.stock}
              onDecrement={decrementQuantity}
              onIncrement={incrementQuantity}
              quantity={quantity}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Button
                className="flex-1 gap-2"
                disabled={isOutOfStock || isAddingToCart}
                onClick={handleAddToCart}
                size="lg"
              >
                {isAddingToCart ? (
                  <div className="flex items-center">
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Agregando...
                  </div>
                ) : (
                  <>
                    <ShoppingCartIcon className="mr-2 h-5 w-5" />
                    {isOutOfStock ? 'Producto agotado' : 'Agregar al carrito'}
                  </>
                )}
              </Button>

              <ProductShare productName={product.name} />
            </div>

            <span className="text-right text-muted-foreground text-xs">
              {variant.stock} unidades restantes
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ProductDisplay = memo(({ product, variant }: Props) => {
  return <ProductDisplayComponent product={product} variant={variant} />
})
