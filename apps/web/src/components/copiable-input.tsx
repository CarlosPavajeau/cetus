import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@cetus/ui/input-group'
import { useCopyToClipboard } from '@uidotdev/usehooks'
import { CheckIcon, CopyIcon } from 'lucide-react'

type Props = {
  value: string
}

export function CopiableInput({ value }: Props) {
  const [copiedText, copyToClipboard] = useCopyToClipboard()
  const hasCopiedText = Boolean(copiedText)

  return (
    <InputGroup>
      <InputGroupInput
        className="field-sizing-content"
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
          {hasCopiedText ? <CheckIcon /> : <CopyIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
