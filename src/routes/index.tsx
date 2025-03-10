import type { Category } from '@/api/categories'
import type { ProductForSale } from '@/api/products'
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
import { AnimatePresence, motion } from 'framer-motion'
import { CircleXIcon, FilterIcon, SearchIcon, XIcon } from 'lucide-react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'

const ANIMATION_DURATION = 0.2

export const Route = createFileRoute('/')({
  component: IndexPage,
})

interface ProductFilteringResult {
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  searchInput: string
  setSearchInput: (input: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  handleClearSearch: () => void
  handleClearFilters: () => void
  filteredProducts: ProductForSale[]
  activeCategory: Category | null
  isFiltering: boolean
}

// Custom hooks
function useProductFiltering(
  products: ProductForSale[] | undefined,
  categories: Category[] | undefined,
): ProductFilteringResult {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchInput, setSearchInput] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setSelectedCategory('all')
  }, [])

  const activeCategory = useMemo(() => {
    if (selectedCategory === 'all' || !categories) return null
    return (
      categories.find((category) => category.id === selectedCategory) || null
    )
  }, [categories, selectedCategory])

  const filteredProducts = useMemo(() => {
    if (!products) {
      return []
    }

    return products.filter((product) => {
      // Filter by category
      if (
        selectedCategory !== 'all' &&
        product.categoryId !== selectedCategory
      ) {
        return false
      }

      // Filter by search term
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

  const isFiltering = searchInput.length > 0 || selectedCategory !== 'all'

  return {
    selectedCategory,
    setSelectedCategory,
    searchInput,
    setSearchInput,
    inputRef,
    handleClearSearch,
    handleClearFilters,
    filteredProducts,
    activeCategory,
    isFiltering,
  }
}

interface CategoryFilterProps {
  categories: Category[] | undefined
  selectedCategory: string
  onCategoryChange: (value: string) => void
}

const CategoryFilter = ({
  categories,
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) => {
  if (!categories || categories.length === 0) return null

  return (
    <div className="*:not-first:mt-2">
      <Label htmlFor="category">Categoría</Label>
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger id="category">
          <SelectValue placeholder="Seleccionar categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface SearchBarProps {
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
  inputRef: React.MutableRefObject<HTMLInputElement | null>
}

const SearchBar = ({
  id,
  value,
  onChange,
  onClear,
  inputRef,
}: SearchBarProps) => (
  <div className="*:not-first:mt-2">
    <Label htmlFor={id}>Buscar productos</Label>
    <div className="relative">
      <Input
        id={id}
        ref={inputRef}
        value={value}
        onChange={onChange}
        className="peer ps-9 pe-9 transition-all duration-200"
        placeholder="Buscar productos"
        type="search"
        aria-label="Buscar productos"
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
        <SearchIcon size={16} />
      </div>
      {value && (
        <button
          className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Limpiar búsqueda"
          onClick={onClear}
        >
          <CircleXIcon size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  </div>
)

interface ActiveFiltersProps {
  category: Category | null
  onClear: () => void
}

const ActiveFilters = ({ category, onClear }: ActiveFiltersProps) => {
  if (!category) return null

  return (
    <motion.div
      className="mb-6 flex flex-wrap items-center gap-2"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: ANIMATION_DURATION }}
    >
      <Badge className="gap-0 shadow-sm">
        <FilterIcon size={12} className="mr-1" />
        Categoría: {category.name}
        <button
          className="-my-px -ms-px -me-1.5 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[inherit] p-0 text-primary-foreground/60 outline-none transition-[color,box-shadow] hover:text-primary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onClick={onClear}
          aria-label="Quitar filtro de categoría"
        >
          <XIcon size={12} aria-hidden="true" />
        </button>
      </Badge>
    </motion.div>
  )
}

interface EmptyStateProps {
  onClearFilters: () => void
}

const EmptyState = ({ onClearFilters }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border bg-muted/30 p-6 text-center shadow-sm"
  >
    <div className="mb-4 rounded-full bg-muted p-3">
      <SearchIcon size={24} className="text-muted-foreground" />
    </div>
    <h3 className="mb-2 font-medium text-lg">No se encontraron productos</h3>
    <p className="mb-4 text-muted-foreground">
      Intenta cambiar los filtros o busca con otros términos.
    </p>
    <Button
      variant="outline"
      onClick={onClearFilters}
      className="group transition-all duration-300"
    >
      <XIcon
        size={16}
        className="mr-2 transition-transform group-hover:scale-110"
      />
      Borrar filtros
    </Button>
  </motion.div>
)

function IndexPage() {
  const { products, isLoading } = useProductsForSale()
  const { categories, isLoading: isLoadingCategories } = useCategories()
  const searchInputId = useId()

  const {
    selectedCategory,
    setSelectedCategory,
    searchInput,
    setSearchInput,
    inputRef,
    handleClearSearch,
    handleClearFilters,
    filteredProducts,
    activeCategory,
    isFiltering,
  } = useProductFiltering(products, categories)

  if (isLoadingCategories || isLoading) {
    return (
      <DefaultPageLayout showCart>
        <DefaultLoader />
      </DefaultPageLayout>
    )
  }

  if (!products) {
    return (
      <DefaultPageLayout showCart>
        <PageHeader title="No se encontraron productos" />
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout showCart>
      <PageHeader title="Nuestros productos" />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        <SearchBar
          id={searchInputId}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onClear={handleClearSearch}
          inputRef={inputRef}
        />

        {isFiltering && (
          <div className="flex items-end md:justify-end">
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              className="mb-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <XIcon size={16} className="mr-2" />
              Limpiar todos los filtros
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeCategory && (
          <ActiveFilters
            category={activeCategory}
            onClear={() => setSelectedCategory('all')}
          />
        )}
      </AnimatePresence>

      <div className="relative my-8">
        <AnimatePresence mode="wait">
          {filteredProducts.length > 0 ? (
            <motion.div
              key="products"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ANIMATION_DURATION }}
            >
              <ProductGrid products={filteredProducts} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ANIMATION_DURATION }}
            >
              <EmptyState onClearFilters={handleClearFilters} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DefaultPageLayout>
  )
}
