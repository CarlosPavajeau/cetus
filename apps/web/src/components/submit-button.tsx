import { Button, type buttonVariants } from '@cetus/ui/button'
import { cn } from '@cetus/web/shared/utils'
import type { VariantProps } from 'class-variance-authority'
import { LoaderCircleIcon } from 'lucide-react'
import type * as React from 'react'

type Props = {
  children: React.ReactNode
  isSubmitting: boolean
  disabled: boolean
} & React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    selected?: boolean
    asChild?: boolean
  }

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
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
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
