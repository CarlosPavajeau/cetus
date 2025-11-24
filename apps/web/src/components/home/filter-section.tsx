import type { Category } from '@cetus/api-client/types/categories'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { Input } from '@cetus/ui/input'
import { Label } from '@cetus/ui/label'
import { cn } from '@cetus/web/shared/utils'
import {
  ChevronLeft,
  ChevronRight,
  CircleXIcon,
  SearchIcon,
} from 'lucide-react'
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react'

type Props = {
  searchTerm: string
  setSearchTerm: (value: string) => void
  selectedCategories: string[]
  setSelectedCategories: (
    value: string[] | ((prev: string[]) => string[]),
  ) => void
  categories: Category[]
}

type CategoryFilterProps = {
  categories: Category[]
  selectedCategories: string[]
  setSelectedCategories: (
    value: string[] | ((prev: string[]) => string[]),
  ) => void
}

const MemoizedCategoryFilter = memo(function CategoryFilterInternal({
  categories,
  selectedCategories,
  setSelectedCategories,
}: CategoryFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScrollButtons = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const {
        scrollLeft: currentScrollLeft,
        scrollWidth: totalScrollWidth,
        clientWidth: visibleWidth,
      } = container
      setShowLeftArrow(currentScrollLeft > 0)
      setShowRightArrow(currentScrollLeft < totalScrollWidth - visibleWidth - 1)
    }
  }, [])

  useEffect(() => {
    checkScrollButtons()
    const handleResize = () => checkScrollButtons()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [checkScrollButtons])

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200
      const newScrollLeft =
        direction === 'left'
          ? scrollContainerRef.current.scrollLeft - scrollAmount
          : scrollContainerRef.current.scrollLeft + scrollAmount

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      })
    }
  }, [])

  const toggleCategory = useCallback(
    (categoryId: string) => {
      setSelectedCategories((prev: string[]) =>
        prev.includes(categoryId)
          ? prev.filter((id: string) => id !== categoryId)
          : [...prev, categoryId],
      )
    },
    [setSelectedCategories],
  )

  const clearAllCategories = useCallback(() => {
    setSelectedCategories([])
  }, [setSelectedCategories])

  const scrollLeft = useCallback(() => scroll('left'), [scroll])
  const scrollRight = useCallback(() => scroll('right'), [scroll])

  return (
    <div className="relative flex items-center">
      <Button
        aria-label="Scroll categories left"
        className={cn(
          '-left-1.5 absolute z-10 h-8 w-8 rounded bg-card',
          showLeftArrow ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={scrollLeft}
        size="sm"
        variant="ghost"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div
        className="scrollbar-hide flex gap-2 overflow-x-auto"
        onScroll={checkScrollButtons}
        ref={scrollContainerRef}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <Badge
          className="shrink-0 cursor-pointer rounded px-2 py-1 transition-colors duration-200"
          onClick={clearAllCategories}
          variant={selectedCategories.length === 0 ? 'default' : 'secondary'}
        >
          Todas
        </Badge>
        {categories.map((category) => (
          <MemoizedCategoryBadge
            category={category}
            isSelected={selectedCategories.includes(category.id)}
            key={category.id}
            onToggle={toggleCategory}
          />
        ))}
      </div>

      <Button
        aria-label="Scroll categories right"
        className={cn(
          '-right-1.5 absolute z-10 h-8 w-8 rounded bg-card',
          showRightArrow ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={scrollRight}
        size="sm"
        variant="ghost"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
})

const MemoizedCategoryBadge = memo(function CategoryBadgeInternal({
  category,
  isSelected,
  onToggle,
}: {
  category: Category
  isSelected: boolean
  onToggle: (categoryId: string) => void
}) {
  const handleClick = useCallback(() => {
    onToggle(category.id)
  }, [category.id, onToggle])

  return (
    <Badge
      className="shrink-0 cursor-pointer rounded px-2 py-1 transition-colors duration-200"
      onClick={handleClick}
      variant={isSelected ? 'default' : 'secondary'}
    >
      {category.name}
    </Badge>
  )
})

const MemoizedFilterSection = memo(function FilterSectionInternal({
  searchTerm,
  setSearchTerm,
  selectedCategories,
  setSelectedCategories,
  categories,
}: Props) {
  const id = useId()

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value)
    },
    [setSearchTerm],
  )

  const handleClear = useCallback(() => {
    setSearchTerm('')
  }, [setSearchTerm])

  return (
    <div className="mb-6 flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <Label>Categorías</Label>
        <MemoizedCategoryFilter
          categories={categories}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
        />
      </div>

      <div>
        <div className="relative">
          <Input
            aria-label="Buscar productos..."
            className="peer ps-9 pe-9 transition-all duration-200"
            id={id}
            onChange={handleSearchChange}
            placeholder="Buscar productos..."
            type="search"
            value={searchTerm}
          />
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
            <SearchIcon size={16} />
          </div>
          {searchTerm && (
            <button
              aria-label="Limpiar búsqueda"
              className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleClear}
              type="button"
            >
              <CircleXIcon aria-hidden="true" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export const FilterSection = MemoizedFilterSection
