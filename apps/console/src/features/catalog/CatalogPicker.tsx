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
 * Picks an entry of the catalog to fill in the form. It holds no value: once picked, the form owns the
 * data and the box clears for the next search.
 */
export function CatalogPicker<T extends { id: string }>({
  label,
  placeholder,
  empty,
  items,
  itemLabel,
  onPick,
}: {
  label: string;
  placeholder: string;
  empty: string;
  items: T[];
  itemLabel: (item: T) => string;
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
        value={null}
        onValueChange={(item: T | null) => {
          if (item) {
            onPick(item);
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
            {(item: T) => (
              <ComboboxItem key={item.id} value={item}>
                {itemLabel(item)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
