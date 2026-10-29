import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { Monogram } from "~/components/Monogram";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { accountQuery } from "~/features/account/queries";
import { planTitle } from "~/features/usage/labels";
import { usageQuery } from "~/features/usage/queries";
import { authClient } from "~/lib/auth/client";

const organizationsQuery = queryOptions({
  queryKey: ["organizations"],
  queryFn: async () => {
    const { data, error } = await authClient.organization.list();
    if (error) {
      throw new Error("Could not list the organizations");
    }
    return data;
  },
});

/** The active organization and its plan; opens the list of the person's other organizations to switch. */
export function OrganizationSwitcher({
  activeOrganizationId,
  locked,
}: {
  activeOrganizationId: string;
  /** While impersonating: support sees the person's organization, it does not change it. */
  locked: boolean;
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: account } = useQuery(accountQuery);
  const { data: usage } = useQuery(usageQuery);
  const { data: organizations, isError: organizationsFailed } = useQuery(organizationsQuery);
  const name =
    account?.name ??
    organizations?.find((organization) => organization.id === activeOrganizationId)?.name ??
    "Organización";
  const switchTo = useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.setActive({ organizationId });
      if (error) {
        throw new Error("No pudimos abrir esa organización. Inténtalo de nuevo.");
      }
    },
    onSuccess: async () => {
      // Everything cached belongs to the previous organization.
      queryClient.clear();
      await router.invalidate();
      await navigate({ to: "/overview" });
    },
  });

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={locked}
            render={
              <SidebarMenuButton
                size="lg"
                variant="outline"
                tooltip={name}
                // oxlint-disable-next-line shadcn/no-restyle -- keeps the trigger highlighted while its menu is open
                className="data-popup-open:bg-sidebar-accent"
              />
            }
          >
            <Monogram name={name} />
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{name}</span>
              {usage && (
                <span className="truncate text-2xs text-muted-foreground">
                  {planTitle(usage.current.plan)}
                </span>
              )}
            </span>
            {!locked && <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="start"
            className="w-auto min-w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
              {organizations?.map((organization) => (
                <DropdownMenuItem
                  key={organization.id}
                  disabled={switchTo.isPending}
                  onClick={() => {
                    if (organization.id !== activeOrganizationId) {
                      switchTo.mutate(organization.id);
                    }
                  }}
                >
                  <Monogram name={organization.name} className="size-6 text-2xs" />
                  <span className="truncate">{organization.name}</span>
                  {organization.id === activeOrganizationId && <CheckIcon className="ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {organizationsFailed && (
              <p role="alert" className="px-1.5 py-1 text-xs text-destructive">
                No pudimos cargar tus organizaciones. Recarga la página para intentarlo de nuevo.
              </p>
            )}
            {switchTo.error && (
              <p role="alert" className="px-1.5 py-1 text-xs text-destructive">
                {switchTo.error.message}
              </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
