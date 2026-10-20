import { StatusBadge } from "~/components/ui/badge";
import type { ApiKey } from "~/lib/api/types";

export function ApiKeyStatusBadge({ apiKey }: { apiKey: ApiKey }) {
  return apiKey.revokedAt ? (
    <StatusBadge>Revocada</StatusBadge>
  ) : (
    <StatusBadge status="success">Activa</StatusBadge>
  );
}
