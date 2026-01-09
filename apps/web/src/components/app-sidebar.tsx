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
} from '@cetus/ui/sidebar'
import {
  type SidebarMenuElement,
  SidebarMenuItemWithCollapsible,
} from '@cetus/ui/sidebar-menu-item'
import { OrganizationSwitcher } from '@cetus/web/components/organization-switcher'
import { UserMenu } from '@cetus/web/components/user-menu'
import {
  BadgePercentIcon,
  BoxesIcon,
  CreditCardIcon,
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
    label: 'Inventario',
    href: '/app/inventory',
    isNew: false,
    icon: BoxesIcon,
    items: [
      {
        label: 'Realizar ajustes',
        href: '/app/inventory/adjustment',
        isNew: true,
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
  {
    label: 'Pagos',
    href: '/app/payments',
    isNew: false,
    icon: CreditCardIcon,
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
