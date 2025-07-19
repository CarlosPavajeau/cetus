import { ThemeSwitch } from '@/components/theme-switch'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useRouteContext } from '@tanstack/react-router'
import { UserMenu } from './user-menu'

export const AppNav = () => {
  const { user } = useRouteContext({
    from: '/app',
  })

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex h-4 items-center gap-2 px-4">
        <SidebarTrigger className="-ms-2 hover:bg-accent/50" />

        <Separator orientation="vertical" className="mr-2 ml-2 h-4" />

        <ThemeSwitch />
      </div>

      <div className="ml-auto flex items-center px-6">
        <UserMenu />
      </div>
    </header>
  )
}
