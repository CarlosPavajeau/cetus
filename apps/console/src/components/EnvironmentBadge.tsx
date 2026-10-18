import { Badge } from "~/components/ui/badge";
import type { Environment } from "~/lib/api/types";

export function EnvironmentBadge({ environment }: { environment: Environment }) {
  return environment === "TEST" ? (
    <Badge variant="secondary">Pruebas</Badge>
  ) : (
    <Badge>Producción</Badge>
  );
}
