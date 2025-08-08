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
        aria-label="Scroll categories left"
        className={cn(
          '-left-1.5 absolute z-10 h-8 w-8 rounded bg-card',
          showLeftArrow ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => scroll('left')}
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
          onClick={() => setSelectedCategories([])}
          variant={selectedCategories.length === 0 ? 'default' : 'secondary'}
        >
          Todas
        </Badge>
        {categories.map((category) => (
          <Badge
            className="shrink-0 cursor-pointer rounded px-2 py-1 transition-colors duration-200"
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            variant={
              selectedCategories.includes(category.id) ? 'default' : 'secondary'
            }
          >
            {category.name}
          </Badge>
        ))}
      </div>

      <Button
        aria-label="Scroll categories right"
        className={cn(
          '-right-1.5 absolute z-10 h-8 w-8 rounded bg-card',
          showRightArrow ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => scroll('right')}
        size="sm"
        variant="ghost"
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
            aria-label="Buscar productos..."
            className="peer ps-9 pe-9 transition-all duration-200"
            id={id}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              onClick={onClear}
              type="button"
            >
              <CircleXIcon aria-hidden="true" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const FilterSection = memo(FilterSectionComponent)
