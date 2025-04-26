import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Link, useRouterState } from '@tanstack/react-router'
import { Badge } from './ui/badge'

const TABS = [
  {
    label: 'Pedidos',
    href: '/app',
    isNew: false,
  },
  {
    label: 'Productos',
    href: '/app/products',
    isNew: false,
  },
  {
    label: 'Categorias',
    href: '/app/categories',
    isNew: false,
  },
  {
    label: 'Panel',
    href: '/app/dashboard',
    isNew: false,
  },
] as const

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouterState()
  const currentPath = router.location.pathname

  const sidebar = useSidebar()
  const closeSidebar = () => {
    if (sidebar.isMobile) {
      sidebar.setOpenMobile(false)
    }
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-center px-2 py-3">
          <div className="grid flex-1 text-center text-base leading-tight">
            <span className="truncate font-medium">TELEDIGITAL JYA</span>
          </div>
        </div>

        <hr className="-mt-px mx-2 border-border border-t" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup key="main">
          <SidebarGroupLabel className="text-muted-foreground uppercase">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {TABS.map((tab) => (
                <SidebarMenuItem key={tab.href}>
                  <SidebarMenuButton
                    className="group/menu-button h-9 gap-3 font-medium group-data-[collapsible=icon]:px-[5px]! [&>svg]:size-auto"
                    isActive={currentPath === tab.href}
                    onClick={closeSidebar}
                    asChild
                  >
                    <Link to={tab.href}>
                      <span>{tab.label}</span>
                      {tab.isNew && (
                        <Badge>
                          <span className="text-xs">Nuevo</span>
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup key="config">
          <SidebarGroupLabel className="text-muted-foreground uppercase">
            Configuraciones
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="group/menu-button h-9 gap-3 font-medium group-data-[collapsible=icon]:px-[5px]! [&>svg]:size-auto"
                  isActive={currentPath === '/app/delivery-fees'}
                  onClick={closeSidebar}
                  asChild
                >
                  <Link to="/app/delivery-fees">
                    <span>Costos de envio</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
