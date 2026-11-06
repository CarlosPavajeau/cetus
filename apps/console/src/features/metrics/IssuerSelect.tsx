import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { issuerName } from "~/features/issuers/labels";
import type { Issuer } from "~/lib/api/types";

const all = "all";

export function IssuerSelect({
  issuers,
  value,
  onChange,
}: {
  issuers: Issuer[];
  value: string | undefined;
  onChange: (issuerId: string | undefined) => void;
}) {
  const items = [
    { label: "Todos los emisores", value: all },
    ...issuers.map((issuer) => ({ label: issuerName(issuer), value: issuer.id })),
  ];

  return (
    <Select
      items={items}
      value={value ?? all}
      onValueChange={(next) => {
        const issuer = issuers.find((each) => each.id === next);
        onChange(issuer?.id);
      }}
    >
      <SelectTrigger aria-label="Emisor" className="max-w-56 min-w-40">
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
