import type {
  ProductForSale,
  ProductVariantResponse,
} from '@cetus/api-client/types/products'
import { Button } from '@cetus/ui/button'
import { Label } from '@cetus/ui/label'
import { Currency } from '@cetus/web/components/currency'
import { ProductImages } from '@cetus/web/features/products/components/product-images'
import { ProductRating } from '@cetus/web/features/products/components/product-rating'
import { ProductShare } from '@cetus/web/features/products/components/product-share'
import { useCart } from '@cetus/web/store/cart'
import { Link } from '@tanstack/react-router'
import { MinusIcon, PlusIcon, ShoppingCartIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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

const ProductOptions = ({
  product,
  currentVariantId,
}: Readonly<ProductOptionsProps>) => {
  // Group option values by option type
  const optionGroups = useMemo(
    () => createOptionGroups(product.variants),
    [product.variants],
  )

  // Get current variant's option values
  const currentVariant = product.variants.find((v) => v.id === currentVariantId)
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
}

type QuantitySelectorProps = {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  max?: number
  stock: number
}

const QuantitySelector = ({
  quantity,
  onIncrement,
  onDecrement,
  max = Number.POSITIVE_INFINITY,
  stock,
}: Readonly<QuantitySelectorProps>) => {
  const isMaxReached = max !== Number.POSITIVE_INFINITY && quantity >= max

  return (
    <div className="flex items-center gap-3">
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
      </div>

      <span
        aria-live="polite"
        className="text-muted-foreground text-sm"
      >
        {isMaxReached ? `Máximo: ${max}` : `${stock} disponibles`}
      </span>
    </div>
  )
}

type Props = {
  product: ProductForSale
  variant: ProductVariantResponse
}

export function ProductDisplay({ product, variant }: Readonly<Props>) {
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
          productId: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: variant.images.at(0)?.imageUrl ?? 'placeholder.svg',
          price: variant.price,
          variantId: variant.id,
          stock: variant.stock,
          optionValues: variant.optionValues,
        },
        quantity,
      )
      setIsAddingToCart(false)

      if (!success) {
        toast.error('No hay suficiente stock')
        return
      }

      toast.success('Producto agregado al carrito', {
        duration: 3000,
      })
    }, 300)
  }, [cart, product, quantity, variant])

  const isOutOfStock = variant.stock <= 0

  // Ensure quantity stays within the current variant's stock
  useEffect(() => {
    setQuantity((q) => {
      const max = Math.max(variant.stock, 0)
      if (max === 0) {
        return 1
      }

      return Math.min(q, max)
    })
  }, [variant.stock])

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ProductImages images={variant.images} />

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-bold font-heading text-2xl lg:text-3xl">
            {product.name}
          </h1>

          <div className="mt-2 flex items-center gap-2">
            <ProductRating
              rating={product.rating}
              reviewsCount={product.reviewsCount}
            />
          </div>

          <div className="mt-4 font-bold text-4xl">
            <Currency currency="COP" value={variant.price} />
          </div>
        </div>

        {product.description && (
          <p className="text-muted-foreground leading-relaxed">
            {product.description}
          </p>
        )}

        <ProductOptions currentVariantId={variant.id} product={product} />

        <div className="space-y-4">
          <QuantitySelector
            max={variant.stock}
            onDecrement={decrementQuantity}
            onIncrement={incrementQuantity}
            quantity={quantity}
            stock={variant.stock}
          />

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
        </div>
      </div>
    </div>
  )
}
