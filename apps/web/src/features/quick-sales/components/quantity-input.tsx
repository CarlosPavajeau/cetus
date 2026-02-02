import { Button } from '@cetus/ui/button'
import { Input } from '@cetus/ui/input'
import { ButtonGroup } from '@cetus/web/components/ui/button-group'
import { MinusIcon, PlusIcon } from 'lucide-react'
import type { ChangeEvent } from 'react'

type Props = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export function QuantityInput({
  value,
  onChange,
  min = 1,
  max,
}: Readonly<Props>) {
  const decrement = () => {
    const next = value - 1
    if (next >= min) {
      onChange(next)
    }
  }

  const increment = () => {
    const next = value + 1
    if (max === undefined || next <= max) {
      onChange(next)
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') {
      onChange(min)
      return
    }

    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) {
      return
    }

    if (parsed < min) {
      onChange(min)
    } else if (max !== undefined && parsed > max) {
      onChange(max)
    } else {
      onChange(parsed)
    }
  }

  return (
    <ButtonGroup>
      <Button
        aria-label="decrement"
        disabled={value <= min}
        onClick={decrement}
        size="icon"
        type="button"
        variant="outline"
      >
        <span className="sr-only">Disminuir cantidad</span>
        <MinusIcon />
      </Button>

      <Input
        className="w-16 text-center"
        inputMode="numeric"
        max={max}
        min={min}
        onChange={handleInputChange}
        type="text"
        value={value}
      />

      <Button
        aria-label="increment"
        disabled={max !== undefined && value >= max}
        onClick={increment}
        size="icon"
        type="button"
        variant="outline"
      >
        <PlusIcon />
        <span className="sr-only">Aumentar cantidad</span>
      </Button>
    </ButtonGroup>
  )
}
