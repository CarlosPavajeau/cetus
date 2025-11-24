import { Input } from '@cetus/ui/input'
import { cn } from '@cetus/web/shared/utils'
import { CircleXIcon, ListFilterIcon } from 'lucide-react'
import { useId } from 'react'

type Props = {
  value?: string
  onSearch: (value: string) => void
}

export function SearchInput({ value = '', onSearch }: Readonly<Props>) {
  const id = useId()

  const handleClearFilter = () => {
    onSearch('')
  }

  return (
    <div className="relative flex-1">
      <Input
        aria-label="Buscar por número de orden"
        className={cn('peer min-w-60 flex-1 ps-9', Boolean(value) && 'pe-9')}
        id={`${id}-input`}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Buscar por número de orden..."
        type="text"
        value={value ?? ''}
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
        <ListFilterIcon aria-hidden="true" size={16} />
      </div>
      {Boolean(value) && (
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
