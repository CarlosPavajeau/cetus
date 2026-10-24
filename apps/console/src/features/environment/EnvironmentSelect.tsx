import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Environment } from "~/lib/api/types";

import { activeEnvironmentQuery, useActiveEnvironment, usePageEnvironment } from "./queries";
import { setActiveEnvironment } from "./server";

export const environmentLabel = {
  SANDBOX: "Simulación",
  TEST: "Pruebas",
  LIVE: "Producción",
} as const satisfies Record<Environment, string>;

const items = (["SANDBOX", "TEST", "LIVE"] as const).map((value) => ({
  value,
  label: environmentLabel[value],
}));

/**
 * The environment the console works in: the documents it lists and where new ones are issued. Leaving the
 * environment of the document on screen goes back to the list, so the page never mixes the two.
 */
export function EnvironmentSelect() {
  const environment = useActiveEnvironment();
  const page = usePageEnvironment();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const change = useMutation({
    mutationFn: (next: Environment) => setActiveEnvironment({ data: { environment: next } }),
    onSuccess: async (next) => {
      queryClient.setQueryData(activeEnvironmentQuery.queryKey, next);
      if (page !== null && page !== next) {
        await navigate({ to: "/documents" });
        return;
      }
      await router.invalidate();
    },
  });

  return (
    <Select
      items={items}
      // One change at a time, so the last choice is always the one saved.
      disabled={change.isPending}
      value={change.isPending && change.variables ? change.variables : environment}
      onValueChange={(next) => {
        const value = items.find((item) => item.value === next)?.value;
        if (value && value !== environment) {
          change.mutate(value);
        }
      }}
    >
      <SelectTrigger aria-label="Ambiente" size="sm" className="min-w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
