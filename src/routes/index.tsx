import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { PageHeader } from '@/components/page-header'
import { ProductGrid } from '@/components/product-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/hooks/use-categories'
import { useProductsForSale } from '@/hooks/use-products-for-sale'
import { createFileRoute } from '@tanstack/react-router'
import { CircleXIcon, SearchIcon, XIcon } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { products, isLoading } = useProductsForSale()

  const { categories, isLoading: isLoadingCategories } = useCategories()
  const [selectedCategory, setSelectedCategory] = useState('all')

  const id = useId()
  const [searchInput, setSearchInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClearSearch = () => {
    setSearchInput('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const filteredProducts = useMemo(() => {
    if (!products) {
      return []
    }

    return products.filter((product) => {
      if (
        selectedCategory !== 'all' &&
        product.categoryId !== selectedCategory
      ) {
        return false
      }

      if (searchInput) {
        const searchInputLower = searchInput.toLowerCase()
        const productNameLower = product.name.toLowerCase()
        const productDescriptionLower = product.description?.toLowerCase() ?? ''

        if (
          !productNameLower.includes(searchInputLower) &&
          !productDescriptionLower.includes(searchInputLower)
        ) {
          return false
        }
      }

      return true
    })
  }, [products, selectedCategory, searchInput])

  if (isLoadingCategories || isLoading) {
    return (
      <DefaultPageLayout>
        <DefaultLoader />
      </DefaultPageLayout>
    )
  }

  if (!products) {
    return (
      <DefaultPageLayout>
        <PageHeader title="No se encontraron productos" />
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout showCart>
      <PageHeader title="Nuestros productos" />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {categories && (
          <div className="*:not-first:mt-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Seleccionar categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="*:not-first:mt-2">
          <Label htmlFor={id}>Buscar productos</Label>
          <div className="relative">
            <Input
              id={id}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="peer ps-9 pe-9"
              placeholder="Buscar productos"
              type="search"
            />
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
              <SearchIcon size={16} />
            </div>
            {searchInput && (
              <button
                className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Clear input"
                onClick={handleClearSearch}
              >
                <CircleXIcon size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedCategory !== 'all' && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Badge className="gap-0">
            Categoria:{' '}
            {
              categories?.find((category) => category.id === selectedCategory)
                ?.name
            }
            <button
              className="-my-px -ms-px -me-1.5 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[inherit] p-0 text-primary-foreground/60 outline-none transition-[color,box-shadow] hover:text-primary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={() => setSelectedCategory('all')}
            >
              <XIcon size={12} aria-hidden="true" />
            </button>
          </Badge>
        </div>
      )}

      <div className="relative my-8">
        {products && <ProductGrid products={filteredProducts} />}

        {filteredProducts.length === 0 && (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border bg-muted/30 p-6 text-center">
            <div className="mb-4 rounded-full bg-muted p-3">
              <SearchIcon size={24} className="text-muted-foreground" />
            </div>
            <h3 className="mb-2 font-medium text-lg">
              No se encontraron productos
            </h3>
            <p className="mb-4 text-muted-foreground">
              Intenta cambiar los filtros o busca con otros términos.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchInput('')
                setSelectedCategory('all')
              }}
            >
              Borrar filtros
            </Button>
          </div>
        )}
      </div>
    </DefaultPageLayout>
  )
}
