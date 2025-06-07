'use client'

import type { Category } from '@/api/categories'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/shared/cn'
import {
  ChevronLeft,
  ChevronRight,
  CircleXIcon,
  SearchIcon,
} from 'lucide-react'
import { memo, useEffect, useId, useRef, useState } from 'react'
import { Button } from '../ui/button'

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

function CategoryFilter({
  categories,
  selectedCategories,
  setSelectedCategories,
}: CategoryFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    checkScrollButtons()
    const handleResize = () => checkScrollButtons()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [categories])

  const scroll = (direction: 'left' | 'right') => {
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
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev: string[]) =>
      prev.includes(categoryId)
        ? prev.filter((id: string) => id !== categoryId)
        : [...prev, categoryId],
    )
  }

  return (
    <div className="relative flex items-center">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'absolute left-0 z-10 h-8 w-8 rounded-full bg-card shadow-md transition-opacity duration-200 hover:bg-gray-50',
          showLeftArrow ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => scroll('left')}
        aria-label="Scroll categories left"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div
        ref={scrollContainerRef}
        className="scrollbar-hide flex gap-2 overflow-x-auto"
        onScroll={checkScrollButtons}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <Badge
          variant={selectedCategories.length === 0 ? 'default' : 'outline'}
          className="shrink-0 cursor-pointer rounded px-2 py-1"
          onClick={() => setSelectedCategories([])}
        >
          Todas
        </Badge>
        {categories.map((category) => (
          <Badge
            key={category.id}
            variant={
              selectedCategories.includes(category.id) ? 'default' : 'outline'
            }
            className="shrink-0 cursor-pointer rounded px-2 py-1"
            onClick={() => toggleCategory(category.id)}
          >
            {category.name}
          </Badge>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'absolute right-0 z-10 h-8 w-8 rounded-full bg-card shadow-md transition-opacity duration-200 hover:bg-gray-50',
          showRightArrow ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => scroll('right')}
        aria-label="Scroll categories right"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function FilterSectionComponent({
  searchTerm,
  setSearchTerm,
  selectedCategories,
  setSelectedCategories,
  categories,
}: Props) {
  const id = useId()

  const onClear = () => {
    setSearchTerm('')
  }

  return (
    <div className="mb-6 flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <Label>Categorías</Label>
        <CategoryFilter
          categories={categories}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
        />
      </div>

      <div>
        <div className="relative">
          <Input
            id={id}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="peer ps-9 pe-9 transition-all duration-200"
            placeholder="Buscar un producto"
            type="search"
            aria-label="Buscar un producto"
          />
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
            <SearchIcon size={16} />
          </div>
          {searchTerm && (
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
    </div>
  )
}

export const FilterSection = memo(FilterSectionComponent)
