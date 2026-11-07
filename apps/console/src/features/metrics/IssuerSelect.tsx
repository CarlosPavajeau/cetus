import { Combobox as ComboboxPrimitive } from "@base-ui/react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { issuerName, issuerNit } from "~/features/issuers/labels";
import type { Issuer } from "~/lib/api/types";

const all = "all";
const allLabel = "Todos los emisores";

/** Past this many issuers, a list is too long to scan and the picker searches by name or NIT instead. */
const listLengthMax = 5;

type Props = {
  issuers: Issuer[];
  value: string | undefined;
  onChange: (issuerId: string | undefined) => void;
};

export function IssuerSelect({ issuers, value, onChange }: Props) {
  const sorted = issuers.toSorted((a, b) => issuerName(a).localeCompare(issuerName(b), "es"));
  return sorted.length > listLengthMax ? (
    <IssuerSearch issuers={sorted} value={value} onChange={onChange} />
  ) : (
    <IssuerList issuers={sorted} value={value} onChange={onChange} />
  );
}

function IssuerList({ issuers, value, onChange }: Props) {
  const items = [
    { label: allLabel, value: all },
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
      <SelectContent className="w-max max-w-80 min-w-(--anchor-width)">
        <SelectGroup>
          <SelectItem value={all}>{allLabel}</SelectItem>
          {issuers.map((issuer) => (
            <SelectItem key={issuer.id} value={issuer.id}>
              <IssuerOption issuer={issuer} />
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function IssuerSearch({ issuers, value, onChange }: Props) {
  const selected = issuers.find((issuer) => issuer.id === value) ?? null;
  const filter = ComboboxPrimitive.useFilter({ value: selected });

  return (
    <Combobox
      items={issuers}
      value={selected}
      onValueChange={(issuer: Issuer | null) => onChange(issuer?.id)}
      itemToStringLabel={issuerName}
      isItemEqualToValue={(a: Issuer, b: Issuer) => a.id === b.id}
      filter={(issuer: Issuer, query: string) =>
        filter.contains(issuer, query, issuerName) || nitMatches(issuer, query)
      }
    >
      <ComboboxInput
        aria-label="Emisor"
        placeholder={allLabel}
        className="w-56"
        showClear={selected !== null}
        clearLabel="Ver todos los emisores"
      />
      <ComboboxContent>
        <ComboboxEmpty>No hay emisores con ese nombre o NIT.</ComboboxEmpty>
        <ComboboxList>
          {(issuer: Issuer) => (
            <ComboboxItem key={issuer.id} value={issuer}>
              <IssuerOption issuer={issuer} />
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function IssuerOption({ issuer }: { issuer: Issuer }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="whitespace-normal">{issuerName(issuer)}</span>
      <span className="font-mono text-xs text-muted-foreground">{issuerNit(issuer)}</span>
    </span>
  );
}

/** Matches the digits typed, with or without the dots, dash and check digit the RUT prints. */
function nitMatches(issuer: Issuer, query: string) {
  const digits = query.replace(/^\s*nit\s*/i, "").replace(/[\s.-]/g, "");
  return /^\d+$/.test(digits) && `${issuer.nit}${issuer.checkDigit}`.includes(digits);
}
