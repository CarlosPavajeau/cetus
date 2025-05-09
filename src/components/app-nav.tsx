import { ThemeSwitch } from '@/components/theme-switch'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { OrganizationSwitcher, UserButton } from '@clerk/clerk-react'

export const AppNav = () => {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-1 items-center gap-4 px-4">
        <SidebarTrigger className="-ms-2 hover:bg-accent/50" />

        <Separator orientation="vertical" className="h-6 bg-border/40" />

        <ThemeSwitch />
      </div>

      <div className="ml-auto flex items-center gap-4 px-4">
        <OrganizationSwitcher
          hidePersonal
          appearance={{
            elements: {
              organizationSwitcherTrigger:
                'py-2 px-3 hover:bg-accent/50 rounded-md',
            },
          }}
        />

        <Separator orientation="vertical" className="h-6 bg-border/40" />

        <UserButton
          appearance={{
            elements: {
              userButtonTrigger: 'hover:bg-accent/50',
            },
          }}
        />
      </div>
    </header>
  )
}
