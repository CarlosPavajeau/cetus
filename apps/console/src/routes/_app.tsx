import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useMatchRoute,
  useNavigate,
} from "@tanstack/react-router";
import { HistoryIcon, KeyRoundIcon, LayoutDashboardIcon, LogOutIcon } from "lucide-react";

import { Separator } from "~/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { getSession } from "~/features/session/server";
import { authClient } from "~/lib/auth/client";

/** Protected layout: every child route requires a session. */
export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/sign-in" });
    }
    return { session };
  },
  component: AppLayout,
});

const navigation = [
  { to: "/overview", label: "Resumen", icon: LayoutDashboardIcon },
  { to: "/developers/api-keys", label: "Llaves de API", icon: KeyRoundIcon },
  { to: "/activity", label: "Actividad", icon: HistoryIcon },
] as const;

function AppLayout() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();

  async function signOut() {
    await authClient.signOut();
    await navigate({ to: "/sign-in" });
  }

  return (
    <SidebarProvider>
      <Sidebar aria-label="Principal">
        <SidebarHeader>
          <p className="px-2 py-1 font-heading text-sm font-semibold tracking-tight">Cetus</p>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={<Link to={item.to} />}
                      isActive={Boolean(matchRoute({ to: item.to }))}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <p className="truncate px-2 text-xs text-muted-foreground">{session.user.email}</p>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut}>
                <LogOutIcon />
                <span>Cerrar sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">Consola</span>
        </header>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
