import { useCallback, useEffect, useState } from 'react'
import { QuickSaleFab } from './quick-sale-fab'
import { QuickSaleSheet } from './quick-sale-sheet'

export function QuickSaleProvider() {
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'A' &&
        event.shiftKey &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return (
    <>
      <QuickSaleFab onClick={toggle} />
      <QuickSaleSheet onOpenChange={setOpen} open={open} />
    </>
  )
}
