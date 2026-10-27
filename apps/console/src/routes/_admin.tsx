import { useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createFileRoute,
  useMatchRoute,
  useMatches,
  useNavigate,
} from "@tanstack/react-router";
import { ArrowLeftIcon, BuildingIcon, HistoryIcon, LogOutIcon, UsersIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
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
import { requirePlatformStaff } from "~/features/session/guard";
import { authClient } from "~/lib/auth/client";
import { crumbOf } from "~/lib/utils";

/** The Cetus team's administration: staff with 2FA only (the API checks the same from the JWT). */
export const Route = createFileRoute("/_admin")({
  beforeLoad: requirePlatformStaff,
  component: AdminLayout,
});

const navigation = [
  { to: "/admin/organizations", label: "Organizaciones", icon: BuildingIcon },
  { to: "/admin/users", label: "Usuarios", icon: UsersIcon },
  { to: "/admin/audit-log", label: "Auditoría", icon: HistoryIcon },
] as const;

const roleLabel = { admin: "Administrador", support: "Soporte" } as const;

function AdminLayout() {
  const { session, platformRole } = Route.useRouteContext();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const queryClient = useQueryClient();
  const current = navigation.find((item) => matchRoute({ to: item.to, fuzzy: true }));
  const crumb = useMatches({
    select: (matches) =>
      matches.reduce<string | undefined>(
        (found, match) => crumbOf(match.loaderData) ?? found,
        undefined,
      ),
  });

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
    await navigate({ to: "/sign-in" });
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <p className="flex items-center gap-2 px-2 py-1 font-heading text-sm font-semibold tracking-tight">
            Cetus
            <Badge variant="secondary">Administración</Badge>
          </p>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="Administración">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        render={<Link to={item.to} />}
                        isActive={Boolean(matchRoute({ to: item.to, fuzzy: true }))}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex flex-col gap-0.5 px-2">
            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
            <p className="text-2xs text-muted-foreground">{roleLabel[platformRole]}</p>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link to="/overview" />}>
                <ArrowLeftIcon />
                <span>Volver a la consola</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4 data-vertical:self-center" />
          <Breadcrumb>
            <BreadcrumbList className="gap-3 text-xs">
              <BreadcrumbItem>Administración</BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              {current && crumb ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink render={<Link to={current.to} />}>
                      {current.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>/</BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{crumb}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage>{current?.label ?? "Inicio"}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex w-full flex-1 flex-col gap-7 p-4 md:px-10 md:pt-9.5 md:pb-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
