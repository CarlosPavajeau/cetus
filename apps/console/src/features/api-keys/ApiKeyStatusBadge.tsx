import { Badge } from "~/components/ui/badge";
import type { ApiKey } from "~/lib/api/types";

export function ApiKeyStatusBadge({ apiKey }: { apiKey: ApiKey }) {
  return apiKey.revokedAt ? (
    <Badge variant="outline" className="text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden />
      Revocada
    </Badge>
  ) : (
    <Badge variant="outline">
      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
      Activa
    </Badge>
  );
}
