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
        <div className="flex items-center justify-center px-4 py-6">
          <div className="grid flex-1 text-center">
            <span className="font-semibold text-lg text-primary tracking-tight dark:text-primary-foreground">
              TELEDIGITAL JYA
            </span>
          </div>
        </div>

        <hr className="mx-4 border-border/40" />
      </SidebarHeader>

      <SidebarContent>
        {MENU.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel className="px-4 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu>
                {group.items.map((tab) => (
                  <SidebarMenuItem key={tab.href}>
                    <SidebarMenuButton
                      className="group/menu-button h-10 gap-3 font-medium transition-colors hover:bg-accent/50 group-data-[collapsible=icon]:px-[5px]! [&>svg]:size-auto"
                      isActive={currentPath === tab.href}
                      onClick={closeSidebar}
                      asChild
                    >
                      <Link to={tab.href}>
                        <span className="text-sm">{tab.label}</span>
                        {tab.isNew && (
                          <Badge variant="secondary" className="ml-auto">
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
