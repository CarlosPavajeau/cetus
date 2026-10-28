import * as Sentry from "@sentry/tanstackstart-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  BookUserIcon,
  BuildingIcon,
  CircleHelpIcon,
  FileTextIcon,
  HistoryIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  GaugeIcon,
  MailIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react";
import { useEffect } from "react";

import { CetusMark } from "~/components/CetusMark";
import { Monogram } from "~/components/Monogram";
import { ShellError } from "~/components/RouteError";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button, buttonVariants } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { accountQuery } from "~/features/account/queries";
import { ImpersonationBanner } from "~/features/admin/ImpersonationBanner";
import { EnvironmentSelect } from "~/features/environment/EnvironmentSelect";
import { activeEnvironmentQuery } from "~/features/environment/queries";
import { SandboxBanner } from "~/features/environment/SandboxBanner";
import { isSidebarOpen } from "~/features/layout/sidebar";
import { EmailVerificationBanner } from "~/features/session/EmailVerificationBanner";
import { requireMembership } from "~/features/session/guard";
import { OrganizationSwitcher } from "~/features/session/OrganizationSwitcher";
import { ThemeSwitch } from "~/features/theme/ThemeSwitch";
import { authClient } from "~/lib/auth/client";
import { docsUrl } from "~/lib/docs";
import { cn, crumbOf } from "~/lib/utils";

/** Protected layout: every child route requires a session. */
export const Route = createFileRoute("/_app")({
  beforeLoad: requireMembership,
  loader: async ({ context: { queryClient } }) => {
    await queryClient.query({ ...activeEnvironmentQuery, staleTime: "static" });
    return { sidebarOpen: isSidebarOpen() };
  },
  component: AppLayout,
  errorComponent: ShellError,
});

type NavigationItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboardIcon;
  staffOnly?: boolean;
};

/** `breadcrumb`: whether the header names the group before the page. */
const navigation = [
  {
    label: "Espacio de trabajo",
    breadcrumb: false,
    items: [
      { to: "/overview", label: "Resumen", icon: LayoutDashboardIcon },
      { to: "/documents", label: "Documentos", icon: FileTextIcon },
      { to: "/catalog", label: "Catálogo", icon: BookUserIcon },
      { to: "/issuers", label: "Emisores", icon: BuildingIcon },
    ],
  },
  {
    label: "Desarrolladores",
    breadcrumb: true,
    items: [
      { to: "/developers/api-keys", label: "Llaves de API", icon: KeyRoundIcon },
      { to: "/developers/webhooks", label: "Webhooks", icon: WebhookIcon },
      { to: "/activity", label: "Actividad", icon: HistoryIcon },
    ],
  },
  {
    label: "Organización",
    breadcrumb: true,
    items: [
      {
        to: "/admin/organizations",
        label: "Administración",
        icon: ShieldCheckIcon,
        staffOnly: true,
      },
      { to: "/settings/members", label: "Miembros", icon: UsersIcon },
      { to: "/settings/contacts", label: "Contactos", icon: MailIcon },
      { to: "/settings/usage", label: "Plan y uso", icon: GaugeIcon },
      { to: "/settings/security", label: "Seguridad", icon: ShieldIcon },
    ],
  },
] as const satisfies readonly {
  label: string;
  breadcrumb: boolean;
  items: readonly NavigationItem[];
}[];

const pages = navigation.flatMap((group) =>
  group.items.map((item) => ({ ...item, section: group.breadcrumb ? group.label : undefined })),
);

function AppLayout() {
  const { session } = Route.useRouteContext();
  const { sidebarOpen } = Route.useLoaderData();

  // Only the internal ID: never the email or the name.
  useEffect(() => {
    Sentry.setUser({ id: session.user.id });
    return () => Sentry.setUser(null);
  }, [session.user.id]);

  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const queryClient = useQueryClient();
  // Not suspense: the layout must render even if the account cannot be read.
  const { data: account } = useQuery(accountQuery);
  const isStaff = Boolean(session.user.platformRole) && !session.impersonatedBy;
  const current = pages.find((item) => matchRoute({ to: item.to, fuzzy: true }));
  // A detail page names what it shows by returning { crumb } from its loader.
  const crumb = useMatches({
    select: (matches) =>
      matches.reduce<string | undefined>(
        (found, match) => crumbOf(match.loaderData) ?? found,
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
    <SidebarProvider defaultOpen={sidebarOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-3">
          <div className="flex h-10 items-center gap-2.5 px-2 group-data-[collapsible=icon]:px-0.5">
            <CetusMark />
            <span className="font-heading text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              Cetus
            </span>
          </div>
          {session.activeOrganizationId && (
            <OrganizationSwitcher
              activeOrganizationId={session.activeOrganizationId}
              locked={Boolean(session.impersonatedBy)}
            />
          )}
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="Principal">
            {navigation.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items
                      .filter((item) => isStaff || !("staffOnly" in item))
                      .map((item) => (
                        <SidebarMenuItem key={item.to}>
                          <SidebarMenuButton
                            render={<Link to={item.to} />}
                            isActive={Boolean(matchRoute({ to: item.to, fuzzy: true }))}
                            tooltip={item.label}
                          >
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          {/* On a phone the header has no room for it; the sidebar opens as a sheet there. */}
          <ThemeSwitch className="self-start sm:hidden" />
          <div className="flex items-center gap-2.5 px-0 py-1">
            <Monogram name={session.user.name} className="rounded-full" />
            <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">{session.user.name}</span>
              <span className="truncate text-2xs text-muted-foreground">{session.user.email}</span>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut} tooltip="Cerrar sesión">
                <LogOutIcon />
                <span>Cerrar sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <ImpersonationBanner />
        <SandboxBanner />
        {/* While impersonating, the address is the person's to confirm, not support's. */}
        {!session.user.emailVerified && !session.impersonatedBy && (
          <EmailVerificationBanner email={session.user.email} />
        )}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4 data-vertical:self-center" />
          <Breadcrumb>
            <BreadcrumbList className="gap-3 text-xs">
              {current?.section && (
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
          <div className="ml-auto flex items-center gap-2">
            <EnvironmentSelect />
            <ThemeSwitch className="max-sm:hidden" />
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "max-sm:hidden")}
            >
              <BookOpenIcon data-icon="inline-start" />
              Documentación
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
            {/* Placeholder until the help center exists. */}
            <Button variant="ghost" size="icon-sm" disabled>
              <CircleHelpIcon />
              <span className="sr-only">Ayuda</span>
            </Button>
          </div>
        </header>
        <div className="flex w-full flex-1 flex-col gap-7 p-4 md:px-10 md:pt-9.5 md:pb-6">
          {account && account.status !== "ACTIVE" && (
            <Alert variant="destructive">
              <AlertTitle>
                Tu cuenta está {account.status === "CLOSED" ? "cerrada" : "suspendida"}
              </AlertTitle>
              <AlertDescription>
                Puedes consultar tus documentos, pero no hacer cambios, y tus llaves de API no
                funcionan.
                {account.statusReason && ` Motivo: ${account.statusReason}.`} Escríbenos a soporte
                si necesitas ayuda.
              </AlertDescription>
            </Alert>
          )}
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
