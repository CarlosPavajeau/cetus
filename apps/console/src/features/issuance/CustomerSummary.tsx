import { Button } from "~/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "~/components/ui/item";

import { identificationTypes } from "./catalogs";
import type { CustomerValues } from "./schema";

/** The customer in one line, for one picked from the catalog or the final consumer. */
export function CustomerSummary({
  customer,
  onEdit,
}: {
  customer: CustomerValues;
  onEdit: () => void;
}) {
  const document =
    identificationTypes.find((type) => type.value === customer.identificationType)?.label ??
    customer.identificationType;
  const details = [customer.email, customer.cityName].filter(Boolean).join(" · ");
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{customer.legalName}</ItemTitle>
        <ItemDescription>
          {document} {customer.identificationNumber}
          {details && ` · ${details}`}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          Editar datos
        </Button>
      </ItemActions>
    </Item>
  );
}
