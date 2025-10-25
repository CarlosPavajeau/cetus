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
import { OrganizationSwitcher } from '@/components/organization-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  type SidebarMenuElement,
  SidebarMenuItemWithCollapsible,
} from '@/components/ui/sidebar-menu-item'
import { UserMenu } from '@/components/user-menu'

const MAIN_MENU: ReadonlyArray<SidebarMenuElement> = [
  {
    label: 'Panel',
    href: '/app/dashboard',
    isNew: false,
    icon: LayoutDashboardIcon,
  },
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
        href: '/app/product-option-types',
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
  const sidebar = useSidebar()
  const closeSidebar = () => {
    if (sidebar.isMobile) {
      sidebar.setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
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

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
