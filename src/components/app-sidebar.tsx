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

const MAIN_MENU = [
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

const CONFIGURATIONS_MENU = [
  {
    label: 'Costos de envio',
    href: '/app/delivery-fees',
    isNew: false,
  },
] as const

const MENU = [
  {
    id: 'main',
    title: 'Principal',
    items: MAIN_MENU,
  },
  {
    id: 'config',
    title: 'Configuraciones',
    items: CONFIGURATIONS_MENU,
  },
]

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
        {MENU.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel className="text-muted-foreground uppercase">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu>
                {group.items.map((tab) => (
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
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
