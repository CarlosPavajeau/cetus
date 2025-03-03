'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useId } from 'react'
import { Label } from './ui/label'
import { Switch } from './ui/switch'

export function ThemeSwitch() {
  const id = useId()
  const { theme, setTheme } = useTheme()

  const checked = theme === 'light'
  const setChecked = (checked: boolean) => {
    setTheme(checked ? 'light' : 'dark')
  }

  return (
    <div>
      <div className="relative inline-grid h-9 grid-cols-[1fr_1fr] items-center font-medium text-sm">
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={setChecked}
          className="peer [&_span]:data-[state=checked]:rtl:-translate-x-full absolute inset-0 h-[inherit] w-auto data-[state=checked]:bg-input/50 data-[state=unchecked]:bg-input/50 [&_span]:h-full [&_span]:w-1/2 [&_span]:transition-transform [&_span]:duration-300 [&_span]:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)] [&_span]:data-[state=checked]:translate-x-full"
        />
        <span className="pointer-events-none relative ms-0.5 flex min-w-8 items-center justify-center text-center peer-data-[state=checked]:text-muted-foreground/70">
          <MoonIcon size={16} aria-hidden="true" />
        </span>
        <span className="pointer-events-none relative me-0.5 flex min-w-8 items-center justify-center text-center peer-data-[state=unchecked]:text-muted-foreground/70">
          <SunIcon size={16} aria-hidden="true" />
        </span>
      </div>
      <Label htmlFor={id} className="sr-only">
        Cambiar tema
      </Label>
    </div>
  )
}
