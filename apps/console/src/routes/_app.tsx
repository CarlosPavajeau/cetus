import { useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createFileRoute,
  useMatchRoute,
  useMatches,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  BuildingIcon,
  CircleHelpIcon,
  FileTextIcon,
  HistoryIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ShieldIcon,
  WebhookIcon,
} from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
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
import { requireSession } from "~/features/session/guard";
import { authClient } from "~/lib/auth/client";
import { cn } from "~/lib/utils";

/** Protected layout: every child route requires a session. */
export const Route = createFileRoute("/_app")({
  beforeLoad: requireSession,
  component: AppLayout,
});

const navigation = [
  { to: "/overview", label: "Resumen", icon: LayoutDashboardIcon },
  { to: "/documents", label: "Documentos", icon: FileTextIcon },
  { to: "/issuers", label: "Emisores", icon: BuildingIcon },
  {
    to: "/developers/api-keys",
    label: "Llaves de API",
    icon: KeyRoundIcon,
    section: "Desarrolladores",
  },
  {
    to: "/developers/webhooks",
    label: "Webhooks",
    icon: WebhookIcon,
    section: "Desarrolladores",
  },
  { to: "/activity", label: "Actividad", icon: HistoryIcon },
] as const;

function AppLayout() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const queryClient = useQueryClient();
  const current = navigation.find((item) => matchRoute({ to: item.to, fuzzy: true }));
  // A detail page names what it shows by returning { crumb } from its loader.
  const crumb = useMatches({
    select: (matches) =>
      matches.reduce<string | undefined>(
        (found, match) => (match.loaderData as { crumb?: string } | undefined)?.crumb ?? found,
        undefined,
      ),
  });

  async function signOut() {
    await authClient.signOut();
    // The cache belongs to this user's organization: the next session must not see it.
    queryClient.clear();
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
        </SidebarContent>
        <SidebarFooter>
          <p className="truncate px-2 text-xs text-muted-foreground">{session.user.email}</p>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link to="/settings/security" />}
                isActive={Boolean(matchRoute({ to: "/settings/security" }))}
              >
                <ShieldIcon />
                <span>Seguridad</span>
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
              {current && "section" in current && (
                <>
                  <BreadcrumbItem className={cn(crumb && "max-sm:hidden")}>
                    {current.section}
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className={cn(crumb && "max-sm:hidden")}>
                    /
                  </BreadcrumbSeparator>
                </>
              )}
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
                  <BreadcrumbPage>{current?.label ?? "Consola"}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          {/* Placeholders until the documentation and help center exist. */}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled>
              <BookOpenIcon data-icon="inline-start" />
              Documentación
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
            <Button variant="ghost" size="icon-sm" disabled>
              <CircleHelpIcon />
              <span className="sr-only">Ayuda</span>
            </Button>
          </div>
        </header>
        <div className="flex w-full flex-1 flex-col gap-7 p-4 md:px-10 md:pt-9.5 md:pb-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
