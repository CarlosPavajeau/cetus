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
import { useOrganization } from '@clerk/clerk-react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  BadgePercentIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ShoppingBasketIcon,
  StarIcon,
  StoreIcon,
  TagIcon,
  TruckIcon,
} from 'lucide-react'
import { Badge } from './ui/badge'

type SidebarMenuItem = {
  label: string
  href: string
  isNew: boolean
  icon?: React.ComponentType
}

const MAIN_MENU: ReadonlyArray<SidebarMenuItem> = [
  {
    label: 'Pedidos',
    href: '/app',
    isNew: false,
    icon: PackageIcon,
  },
  {
    label: 'Productos',
    href: '/app/products',
    isNew: false,
    icon: ShoppingBasketIcon,
  },
  {
    label: 'Categorias',
    href: '/app/categories',
    isNew: false,
    icon: TagIcon,
  },
  {
    label: 'Panel',
    href: '/app/dashboard',
    isNew: false,
    icon: LayoutDashboardIcon,
  },
  {
    label: 'Reseñas',
    href: '/app/reviews',
    isNew: false,
    icon: StarIcon,
  },
  {
    label: 'Cupones',
    href: '/app/coupons',
    isNew: false,
    icon: BadgePercentIcon,
  },
] as const

const CONFIGURATIONS_MENU: ReadonlyArray<SidebarMenuItem> = [
  {
    label: 'Costos de envio',
    href: '/app/delivery-fees',
    isNew: false,
    icon: TruckIcon,
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

  const org = useOrganization()

  return (
    <Sidebar {...props}>
      <SidebarHeader className="flex h-16 items-center justify-center gap-2 border-b">
        <div className="flex h-4 items-center justify-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-sidebar-primary-foreground">
            <StoreIcon className="size-4" />
          </div>
          <h1 className="line-clamp-1 font-medium text-md">
            {org.organization?.name}
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {MENU.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((tab) => (
                  <SidebarMenuItem key={tab.href}>
                    <SidebarMenuButton
                      isActive={currentPath === tab.href}
                      onClick={closeSidebar}
                      tooltip={tab.label}
                      asChild
                    >
                      <Link to={tab.href}>
                        {tab.icon && <tab.icon />}
                        <span className="text-sm">{tab.label}</span>
                        {tab.isNew && (
                          <Badge className="ml-auto rounded">
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
