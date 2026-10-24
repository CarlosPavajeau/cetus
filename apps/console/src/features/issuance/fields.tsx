import { type ReactNode, useId } from "react";
import { type Control, type FieldPath, type FieldValues, useController } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

/** A choice among fixed options, shown by name instead of the code the API takes. */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  items,
  disabled,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: ReactNode;
  items: readonly { value: string; label: string }[];
  disabled?: boolean;
}) {
  const id = useId();
  const { field, fieldState } = useController({ control, name });
  return (
    <Field data-invalid={fieldState.invalid} className="gap-1.75">
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <Select
        items={items}
        name={field.name}
        value={field.value}
        disabled={disabled}
        onValueChange={(value) => field.onChange(value)}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={fieldState.invalid}
          onBlur={field.onBlur}
        >
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
      {hint && !fieldState.invalid && (
        <FieldDescription className="text-[10px]">{hint}</FieldDescription>
      )}
      <FieldError errors={[fieldState.error]} className="text-[10px]" />
    </Field>
  );
}
