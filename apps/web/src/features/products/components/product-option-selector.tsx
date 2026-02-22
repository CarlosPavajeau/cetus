import type { ProductForSale } from '@cetus/api-client/types/products'
import { Button } from '@cetus/ui/button'
import { Link } from '@tanstack/react-router'
import React from 'react'

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

type Props = {
  product: ProductForSale
  currentVariantId: number
}

export function ProductOptionSelector({ product, currentVariantId }: Props) {
  const optionGroups = React.useMemo(
    () => createOptionGroups(product.variants),
    [product.variants],
  )

  const currentVariant = product.variants.find((v) => v.id === currentVariantId)
  const currentOptionValues = currentVariant?.optionValues || []

  const findCompatibleVariant = React.useCallback(
    (selectedOptionId: number) => {
      const selectedOption = optionGroups
        .flatMap((group) => group.values)
        .find((value) => value.id === selectedOptionId)

      if (!selectedOption) {
        return currentVariantId
      }

      const selectedOptionType = optionGroups.find((group) =>
        group.values.some((value) => value.id === selectedOptionId),
      )

      if (!selectedOptionType) {
        return currentVariantId
      }

      const otherSelectedOptions = currentOptionValues.filter(
        (optionValue) =>
          optionValue.optionTypeId !== selectedOptionType.optionTypeId,
      )

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
    <div className="flex flex-col gap-3">
      {optionGroups.map((group) => (
        <div className="flex flex-col gap-3" key={group.optionTypeId}>
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {group.optionTypeName}
          </span>
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => {
              const isSelected = currentOptionValues.some(
                (optionValue) => optionValue.id === value.id,
              )

              return (
                <>
                  {value.isAvailable && !isSelected ? (
                    <Button
                      asChild
                      className="flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 font-medium text-sm transition-all"
                      variant="outline"
                    >
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
                      className="flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 font-medium text-sm transition-all disabled:opacity-100"
                      disabled
                      variant={isSelected ? 'default' : 'outline'}
                    >
                      {value.value}
                    </Button>
                  )}
                </>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
