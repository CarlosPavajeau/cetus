import type { Category } from '@cetus/api-client/types/categories'
import { Button } from '@cetus/ui/button'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@cetus/web/components/ui/combobox'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@cetus/web/components/ui/input-group'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { ProductsTable } from '@cetus/web/features/products/components/products-table'
import { productQueries } from '@cetus/web/features/products/queries'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/app/products/')({
  component: RouteComponent,
})

type ProductFilters = {
  name?: string
  categoryIds?: string[]
  onlyActive?: boolean
}

function RouteComponent() {
  const anchor = useComboboxAnchor()

  const { data: products, isLoading } = useQuery(productQueries.list)
  const { data: categories } = useCategories()
  const [productFilters, setProductFilters] = useState<ProductFilters>({})
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])

  const handleFilterChange = (
    key: keyof ProductFilters,
    value: string | string[] | boolean,
  ) => {
    setProductFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredData = useMemo(() => {
    if (!products) {
      return []
    }

    let filteredProducts = [...products]

    if (productFilters.name !== undefined) {
      filteredProducts = filteredProducts.filter((product) =>
        product.name
          .toLowerCase()
          .includes(productFilters.name?.toLowerCase() || ''),
      )
    }

    if (
      productFilters.categoryIds !== undefined &&
      productFilters.categoryIds.length > 0
    ) {
      filteredProducts = filteredProducts.filter((product) =>
        productFilters.categoryIds?.includes(product.categoryId),
      )
    }

    if (productFilters.onlyActive !== undefined) {
      filteredProducts = filteredProducts.filter((product) => product.enabled)
    }

    return filteredProducts
  }, [products, productFilters])

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <InputGroup className="lg:ml-auto lg:max-w-72">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} />
            </InputGroupAddon>
            <InputGroupInput
              onChange={(e) => handleFilterChange('name', e.target.value)}
              placeholder="Nombre del producto"
            />
          </InputGroup>

          <Combobox
            autoHighlight
            defaultValue={selectedCategories}
            items={categories}
            itemToStringValue={(category: Category) => category.name}
            multiple
            onValueChange={(selected: Category[]) => {
              setSelectedCategories(selected)
              handleFilterChange(
                'categoryIds',
                selected.map((category) => category.id),
              )
            }}
            value={selectedCategories}
          >
            <ComboboxChips className="w-full max-w-2xl" ref={anchor}>
              <ComboboxValue>
                {(values) => (
                  <>
                    {values.map((category: Category) => (
                      <ComboboxChip key={category.id}>
                        {category.name}
                      </ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder="Categoría" />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>

            <ComboboxContent anchor={anchor}>
              <ComboboxEmpty>No se encontraron categorías.</ComboboxEmpty>
              <ComboboxList>
                {(category: Category) => (
                  <ComboboxItem key={category.id} value={category}>
                    {category.name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

        <Button asChild>
          <Link to="/app/products/new">Crear producto</Link>
        </Button>
      </div>

      {isLoading && <DefaultLoader />}
      {!isLoading && <ProductsTable products={filteredData} />}
    </div>
  )
}
