import { AppNav } from '@cetus/web/components/app-nav'
import { AppSidebar } from '@cetus/web/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@cetus/web/components/ui/sidebar'
import { QuickSaleProvider } from '@cetus/web/features/quick-sales/components/quick-sale-provider'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { StoreProvider } from '@cetus/web/features/stores/components/store-provider'


export const Route = createFileRoute('/_authed/app')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <StoreProvider>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          <AppNav />

          <main className="flex flex-1 flex-col gap-4">
            <Outlet />
          </main>
        </SidebarInset>

        <QuickSaleProvider />
      </SidebarProvider>
    </StoreProvider>
  )
}
