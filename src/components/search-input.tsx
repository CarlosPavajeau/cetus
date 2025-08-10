import { cn } from '@/shared/cn'
import { CircleXIcon, ListFilterIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Input } from './ui/input'

type Props = {
  initialValue?: string
  onSearch: (value: string) => void
  debounceTime?: number
}

export function SearchInput({
  initialValue = '',
  onSearch,
  debounceTime = 300,
}: Props) {
  const [searchTerm, setSearchTerm] = useState(initialValue)
  const id = useId()

  // Debounce search term changes
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchTerm)
    }, debounceTime)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm, onSearch, debounceTime])

  const handleClearFilter = () => {
    setSearchTerm('')
  }

  return (
    <div className="relative flex-1">
      <Input
        aria-label="Buscar por número de orden"
        className={cn(
          'peer min-w-60 flex-1 ps-9',
          Boolean(searchTerm) && 'pe-9',
        )}
        id={`${id}-input`}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar por número de orden..."
        type="text"
        value={searchTerm ?? ''}
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
        <ListFilterIcon aria-hidden="true" size={16} />
      </div>
      {Boolean(searchTerm) && (
        <button
          aria-label="Clear filter"
          className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleClearFilter}
          type="button"
        >
          <CircleXIcon aria-hidden="true" size={16} />
        </button>
      )}
    </div>
  )
}
