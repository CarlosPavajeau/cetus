import { ThemeSwitch } from '@/components/theme-switch'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { OrganizationSwitcher, UserButton } from '@clerk/clerk-react'

export const AppNav = () => {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger className="-ms-4" />

        <Separator
          orientation="vertical"
          className="data-[orientation=vertical]:h-4"
        />

        <ThemeSwitch />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <OrganizationSwitcher hidePersonal />

        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />

        <UserButton />
      </div>
    </header>
  )
}
