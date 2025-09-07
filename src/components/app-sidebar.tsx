import { OrganizationSwitcher } from '@/components/organization-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  type SidebarMenuElement,
  SidebarMenuItemWithCollapsible,
} from '@/components/ui/sidebar-menu-item'
import { useRouterState } from '@tanstack/react-router'
import {
  BadgePercentIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ShoppingBasketIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
  User2Icon,
} from 'lucide-react'

const MAIN_MENU: ReadonlyArray<SidebarMenuElement> = [
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
    items: [
      {
        label: 'Todos los productos',
        href: '/app/products',
        isNew: false,
      },
      {
        label: 'Opciones',
        href: '/app/product-options',
        isNew: false,
      },
    ],
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

const CONFIGURATIONS_MENU: ReadonlyArray<SidebarMenuElement> = [
  {
    label: 'Costos de envio',
    href: '/app/delivery-fees',
    isNew: false,
    icon: TruckIcon,
  },
  {
    label: 'Cuenta',
    href: '/app/account',
    isNew: false,
    icon: User2Icon,
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

  const sidebar = useSidebar()
  const closeSidebar = () => {
    if (sidebar.isMobile) {
      sidebar.setOpenMobile(false)
    }
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="flex h-16 items-center justify-center gap-2 border-b">
        <OrganizationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {MENU.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItemWithCollapsible
                    item={item}
                    key={item.href}
                    onItemClick={closeSidebar}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
