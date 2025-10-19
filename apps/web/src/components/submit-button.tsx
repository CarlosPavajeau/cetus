import { LoaderCircleIcon } from 'lucide-react'
import { cn } from '@/shared/cn'
import { Button, type ButtonProps } from './ui/button'

type Props = {
  children: React.ReactNode
  isSubmitting: boolean
  disabled: boolean
} & ButtonProps

export function SubmitButton({
  children,
  isSubmitting,
  disabled,
  ...props
}: Props) {
  return (
    <Button
      disabled={isSubmitting || disabled}
      {...props}
      className={cn(props.className, 'relative')}
    >
      <span style={{ visibility: isSubmitting ? 'hidden' : 'visible' }}>
        {children}
      </span>
      {isSubmitting && (
        <span className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2">
          <LoaderCircleIcon
            aria-hidden="true"
            className="animate-spin"
            size={16}
          />
        </span>
      )}
    </Button>
  )
}
