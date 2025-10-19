import { useRouter } from '@tanstack/react-router'
import { ChevronsUpDownIcon, StoreIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/shared/auth-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './ui/sidebar'

export function OrganizationSwitcher() {
  const { data: activeOrg, isPending: isActiveOrgPending } =
    authClient.useActiveOrganization()
  const { data: orgs, isPending: isOrgsPending } =
    authClient.useListOrganizations()
  const router = useRouter()

  if (isActiveOrgPending || isOrgsPending) {
    return <Skeleton className="h-12 w-full" />
  }

  const onSelectOrg = async (orgId: string) => {
    await authClient.organization.setActive({
      organizationId: orgId,
    })

    router.invalidate()
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
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-sidebar-primary-foreground">
                <StoreIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeOrg?.name}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="bottom"
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
                <div className="flex size-6 items-center justify-center">
                  <StoreIcon className="size-4 shrink-0" />
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
