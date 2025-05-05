'use client'

import type { Category } from '@/api/categories'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CircleXIcon, SearchIcon } from 'lucide-react'
import { memo, useId } from 'react'
import { Label } from '../ui/label'

type Props = {
  searchTerm: string
  setSearchTerm: (value: string) => void
  selectedCategory: string
  setSelectedCategory: (value: string) => void
  categories: Category[]
}

function FilterSectionComponent({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  categories,
}: Props) {
  const id = useId()

  const onClear = () => {
    setSearchTerm('')
  }

  return (
    <div className="mb-8 grid items-center gap-6 md:grid-cols-3">
      <div>
        <Label htmlFor={id} className="mb-2 block font-medium text-sm">
          Buscar productos
        </Label>
        <div className="relative">
          <Input
            id={id}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="peer ps-9 pe-9 transition-all duration-200"
            placeholder="Buscar productos"
            type="search"
            aria-label="Buscar productos"
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

      <div>
        <Label className="mb-2 block font-medium text-sm">Categoría</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Todas</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export const FilterSection = memo(FilterSectionComponent)
