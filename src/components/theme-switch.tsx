'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useId, useState } from 'react'
import { Switch } from './ui/switch'

export function ThemeSwitch() {
  const id = useId()
  const { theme, setTheme } = useTheme()
  const [checked, setChecked] = useState(theme === 'light')

  const toggleSwitch = () => {
    setChecked((prev) => {
      const newChecked = !prev
      setTheme(newChecked ? 'light' : 'dark')
      return newChecked
    })
  }

  return (
    <div
      className="group inline-flex items-center gap-2"
      data-state={checked ? 'checked' : 'unchecked'}
    >
      <span
        id={`${id}-off`}
        className="flex-1 cursor-pointer text-right font-medium text-sm group-data-[state=checked]:text-muted-foreground/70"
        aria-controls={id}
        onClick={() => setChecked(false)}
      >
        <MoonIcon size={16} aria-hidden="true" />
      </span>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={toggleSwitch}
        aria-labelledby={`${id}-off ${id}-on`}
        aria-label="Toggle between dark and light mode"
      />
      <span
        id={`${id}-on`}
        className="flex-1 cursor-pointer text-left font-medium text-sm group-data-[state=unchecked]:text-muted-foreground/70"
        aria-controls={id}
        onClick={() => setChecked(true)}
      >
        <SunIcon size={16} aria-hidden="true" />
      </span>
    </div>
  )
}
