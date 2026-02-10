import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@cetus/ui/input-group'
import { useCopyToClipboard } from '@uidotdev/usehooks'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

type Props = {
  value: string
}

export function CopiableInput({ value }: Props) {
  const [copiedText, copyToClipboard] = useCopyToClipboard()
  const [showCopied, setShowCopied] = useState(false)

  useEffect(() => {
    if (copiedText) {
      setShowCopied(true)
      const timer = setTimeout(() => {
        setShowCopied(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [copiedText])

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
          onClick={() => {
            copyToClipboard(value)
          }}
          size="icon-xs"
          title="Copy"
        >
          {showCopied ? <CheckIcon /> : <CopyIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
