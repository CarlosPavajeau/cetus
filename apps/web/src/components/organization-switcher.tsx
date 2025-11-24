import { authClient } from '@cetus/auth/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@cetus/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@cetus/ui/sidebar'
import { Skeleton } from '@cetus/ui/skeleton'
import { ChevronsUpDownIcon, StoreIcon } from 'lucide-react'

export function OrganizationSwitcher() {
  const { data: activeOrg, isPending: isActiveOrgPending } =
    authClient.useActiveOrganization()
  const { data: orgs, isPending: isOrgsPending } =
    authClient.useListOrganizations()

  const { isMobile } = useSidebar()

  if (isActiveOrgPending || isOrgsPending) {
    return <Skeleton className="h-12 w-full" />
  }

  const onSelectOrg = async (orgId: string) => {
    await authClient.organization.setActive({
      organizationId: orgId,
    })

    window.location.reload()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <StoreIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOrg?.name}</span>
                <span className="truncate text-xs">{activeOrg?.slug}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Tiendas
            </DropdownMenuLabel>
            {orgs?.map((org) => (
              <DropdownMenuItem
                className="gap-2 p-2"
                key={org.id}
                onClick={() => onSelectOrg(org.id)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <StoreIcon className="size-3.5 shrink-0" />
                </div>
                {org.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
