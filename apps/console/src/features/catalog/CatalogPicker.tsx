import { useId, useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/components/ui/combobox";
import { Field, FieldLabel } from "~/components/ui/field";

/**
 * Picks an entry of the catalog to fill in the form, searched on the server as the person types. It holds
 * no value: once picked, the form owns the data and the box clears for the next search. An entry the form
 * cannot represent is listed but disabled, with the reason.
 */
export function CatalogPicker<T extends { id: string }>({
  label,
  placeholder,
  empty,
  items,
  itemLabel,
  unavailable,
  onSearch,
  onPick,
}: {
  label: string;
  placeholder: string;
  empty: string;
  items: T[];
  itemLabel: (item: T) => string;
  /** Why the entry cannot be picked here, or null when it can. */
  unavailable: (item: T) => string | null;
  onSearch: (text: string) => void;
  onPick: (item: T) => void;
}) {
  const id = useId();
  // Remounting clears the search text after each pick.
  const [round, setRound] = useState(0);
  return (
    <Field className="gap-1.75">
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <Combobox
        key={round}
        items={items}
        // The server already searched: every item it returned matches.
        filter={null}
        value={null}
        onInputValueChange={onSearch}
        onValueChange={(item: T | null) => {
          if (item && unavailable(item) === null) {
            onPick(item);
            onSearch("");
            setRound(round + 1);
          }
        }}
        itemToStringLabel={itemLabel}
        isItemEqualToValue={(a: T, b: T) => a.id === b.id}
      >
        <ComboboxInput id={id} placeholder={placeholder} className="w-full" />
        <ComboboxContent>
          <ComboboxEmpty>{empty}</ComboboxEmpty>
          <ComboboxList>
            {(item: T) => {
              const reason = unavailable(item);
              return (
                <ComboboxItem key={item.id} value={item} disabled={reason !== null}>
                  {itemLabel(item)}
                  {reason && <span className="text-muted-foreground"> · {reason}</span>}
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
