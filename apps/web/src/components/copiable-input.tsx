import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@cetus/ui/input-group'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useRef, useState } from 'react'

type Props = {
  value: string
}

export function CopiableInput({ value }: Props) {
  const [showCopied, setShowCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCopy() {
    navigator.clipboard.writeText(value)
    setShowCopied(true)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => setShowCopied(false), 2000)
  }

  return (
    <InputGroup>
      <InputGroupInput
        className="min-w-0 truncate"
        placeholder={value}
        readOnly
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label="Copy"
          onClick={handleCopy}
          size="icon-xs"
          title="Copy"
        >
          {showCopied ? <CheckIcon /> : <CopyIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
