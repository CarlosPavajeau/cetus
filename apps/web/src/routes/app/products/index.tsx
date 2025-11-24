import type { Product } from '@cetus/api-client/types/products'
import { Button } from '@cetus/ui/button'
import {
  type Filter,
  type FilterFieldConfig,
  Filters,
} from '@cetus/web/components/ui/filters'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { ProductsTable } from '@cetus/web/features/products/components/products-table'
import { productQueries } from '@cetus/web/features/products/queries'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { FunnelPlusIcon, PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/app/products/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: products, isLoading } = useQuery(productQueries.list)
  const { data: categories } = useCategories()

  const [filters, setFilters] = useState<Filter[]>([])

  const fields: FilterFieldConfig[] = [
    {
      key: 'name',
      label: 'Nombre',
      operators: [{ value: 'contains', label: 'contiene' }],
      type: 'text',
      className: 'w-40',
      placeholder: 'Buscar por nombre',
      defaultOperator: 'contains',
    },
    {
      key: 'categoryId',
      label: 'Categoría',
      type: 'multiselect',
      className: 'w-[180px]',
      operators: [
        {
          value: 'is_any_of',
          label: 'cualquiera de',
        },
      ],
      options: categories?.map((category) => ({
        value: category.id,
        label: category.name,
      })),
      defaultOperator: 'is_any_of',
    },
    {
      key: 'enabled',
      label: 'Estado',
      type: 'select',
      searchable: false,
      className: 'w-[140px]',
      operators: [
        {
          value: 'is',
          label: 'es',
        },
        {
          value: 'is_not',
          label: 'no es',
        },
      ],
      options: [
        {
          value: 'true',
          label: 'Activo',
          icon: <div className="size-2 rounded-full bg-green-500" />,
        },
        {
          value: 'false',
          label: 'Inactivo',
          icon: <div className="size-2 rounded-full bg-destructive" />,
        },
      ],
    },
  ]

  const filteredData = useMemo(() => {
    if (!products) {
      return []
    }

    let filtered = [...products]

    const activeFilters = filters.filter((filter) => {
      const { values } = filter
      // Check if filter has meaningful values
      if (!values || values.length === 0) {
        return false
      }
      // For text/string values, check if they're not empty strings
      if (
        values.every(
          (value) => typeof value === 'string' && value.trim() === '',
        )
      ) {
        return false
      }

      // For number values, check if they're not null/undefined
      if (values.every((value) => value === null || value === undefined)) {
        return false
      }

      // For arrays, check if they're not empty
      if (values.every((value) => Array.isArray(value) && value.length === 0)) {
        return false
      }

      return true
    })

    for (const filter of activeFilters) {
      const { field, operator, values } = filter
      filtered = filtered.filter((item) => {
        const fieldValue = item[field as keyof Product]
        switch (operator) {
          case 'contains':
            return values.some((value) =>
              String(fieldValue)
                .toLowerCase()
                .includes(String(value).toLowerCase()),
            )
          case 'is_any_of':
            return values.includes(fieldValue)
          case 'is':
            return String(fieldValue) === String(values[0])
          case 'is_not':
            return String(fieldValue) !== String(values[0])
          default:
            return true
        }
      })
    }

    return filtered
  }, [products, filters])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
        <Filters
          addButton={
            <Button mode="icon" size="sm" variant="outline">
              <FunnelPlusIcon />
            </Button>
          }
          fields={fields}
          filters={filters}
          onChange={setFilters}
          size="sm"
        />

        <Button asChild size="xs">
          <Link to="/app/products/new">
            <PlusIcon
              aria-hidden="true"
              className="-ms-1 opacity-60"
              size={16}
            />
            Crear producto
          </Link>
        </Button>
      </div>

      <div className="px-4">
        <ProductsTable isLoading={isLoading} products={filteredData} />
      </div>
    </div>
  )
}
