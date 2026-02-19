'use client'

import { cn } from '@cetus/web/shared/utils'
import {
  animate,
  domAnimation,
  LazyMotion,
  m,
  type UseInViewOptions,
  useInView,
  useMotionValue,
  useTransform,
} from 'motion/react'
import { useEffect, useRef } from 'react'

type CountingNumberProps = {
  from?: number
  to?: number
  duration?: number // seconds
  delay?: number // ms
  className?: string
  startOnView?: boolean
  once?: boolean
  inViewMargin?: UseInViewOptions['margin']
  onComplete?: () => void
  format?: (value: number) => string
}

export function CountingNumber({
  from = 0,
  to = 100,
  duration = 2,
  delay = 0,
  className,
  startOnView = true,
  once = false,
  inViewMargin,
  onComplete,
  format,
  ...props
}: CountingNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once, margin: inViewMargin })
  const hasAnimated = useRef(false)
  const motionValue = useMotionValue(from)
  const display = useTransform(motionValue, (v) =>
    format ? format(v) : String(Math.round(v)),
  )

  // Should start animation?
  const shouldStart =
    !startOnView || (isInView && !(once && hasAnimated.current))

  // biome-ignore lint/correctness/useExhaustiveDependencies: don't needed
  useEffect(() => {
    if (!shouldStart) {
      return
    }

    hasAnimated.current = true
    const timeout = setTimeout(() => {
      const controls = animate(motionValue, to, {
        duration,
        onComplete,
      })
      return () => controls.stop()
    }, delay)
    return () => clearTimeout(timeout)
  }, [shouldStart, from, to, duration, delay])

  return (
    <LazyMotion features={domAnimation}>
      <m.span className={cn('inline-block', className)} ref={ref} {...props}>
        {display}
      </m.span>
    </LazyMotion>
  )
}
