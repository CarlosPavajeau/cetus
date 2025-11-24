import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@cetus/ui/input-group'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { type ComponentProps, useState } from 'react'

type Props = ComponentProps<typeof InputGroupInput> & {
  initialHidden?: boolean
}

export function HideableInput({ ...props }: Props) {
  const [isHidden, setIsHidden] = useState(props.initialHidden ?? false)

  return (
    <InputGroup>
      <InputGroupInput {...props} type={isHidden ? 'password' : 'text'} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label="input visibility"
          onClick={() => {
            setIsHidden((prev) => !prev)
          }}
          size="icon-xs"
          title="input"
        >
          {isHidden ? <EyeIcon /> : <EyeOffIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
