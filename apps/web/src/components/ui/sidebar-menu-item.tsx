'use client'

import { Badge } from '@cetus/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@cetus/ui/collapsible'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@cetus/ui/sidebar'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'

export type SidebarMenuElement = {
  label: string
  href: string
  isNew: boolean
  icon?: React.ComponentType
  items?: SidebarMenuElement[]
}

type SidebarMenuItemWithCollapsibleProps = {
  item: SidebarMenuElement
  onItemClick?: () => void
}

export function SidebarMenuItemWithCollapsible({
  item,
  onItemClick,
}: SidebarMenuItemWithCollapsibleProps) {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const [isOpen, setIsOpen] = useState(false)

  const hasItems = item.items && item.items.length > 0
  const isActive =
    currentPath === item.href ||
    (hasItems && item.items?.some((subItem) => currentPath === subItem.href))

  if (!hasItems) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={currentPath === item.href}
          onClick={onItemClick}
          tooltip={item.label}
        >
          <Link to={item.href}>
            {item.icon && <item.icon />}
            <span className="text-sm">{item.label}</span>
            {item.isNew && (
              <Badge className="ml-auto rounded">
                <span className="text-xs">Nuevo</span>
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible
      asChild
      className="group/collapsible"
      defaultOpen={isActive}
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isActive} tooltip={item.label}>
            {item.icon && <item.icon />}
            <span>{item.label}</span>
            {item.isNew && (
              <Badge className="ml-auto rounded">
                <span className="text-xs">Nuevo</span>
              </Badge>
            )}
            <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items?.map((subItem) => (
              <SidebarMenuSubItem key={subItem.label}>
                <SidebarMenuSubButton asChild>
                  <Link to={subItem.href}>
                    <span>{subItem.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
