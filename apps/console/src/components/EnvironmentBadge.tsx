import { Badge } from "~/components/ui/badge";
import type { Environment } from "~/lib/api/types";

const badges = {
  LIVE: { label: "Producción", variant: "default" },
  TEST: { label: "Pruebas", variant: "secondary" },
  SANDBOX: { label: "Simulación", variant: "outline" },
} as const satisfies Record<Environment, { label: string; variant: string }>;

export function EnvironmentBadge({ environment }: { environment: Environment }) {
  const { label, variant } = badges[environment];
  return <Badge variant={variant}>{label}</Badge>;
}
