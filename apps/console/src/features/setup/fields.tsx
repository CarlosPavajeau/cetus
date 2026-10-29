import { format, parseISO } from "date-fns";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { es } from "react-day-picker/locale";
import { type Control, type FieldPath, type FieldValues, useController } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

type FieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: ReactNode;
  optional?: boolean;
};

/** The id of a field's error, which its control names in `aria-describedby`. */
export const errorIdOf = (id: string) => `${id}-error`;

/** Label, control, hint and error of one form field, laid out as in the assistant's design. */
export function FieldFrame({
  id,
  label,
  hint,
  optional,
  invalid,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  optional?: boolean;
  invalid: boolean;
  error?: { message?: string };
  children: ReactNode;
}) {
  return (
    <Field data-invalid={invalid} size="sm">
      <FieldLabel htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      </FieldLabel>
      {children}
      {hint && !invalid && <FieldDescription>{hint}</FieldDescription>}
      <FieldError id={errorIdOf(id)} errors={[error]} />
    </Field>
  );
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  optional,
  normalize,
  ...input
}: FieldProps<T> &
  Omit<ComponentProps<typeof Input>, "name" | "id"> & {
    /** Cleans what the person types or pastes, such as the spaces around a copied ID. */
    normalize?: (value: string) => string;
  }) {
  const id = useId();
  const { field, fieldState } = useController({ control, name });
  return (
    <FieldFrame
      id={id}
      label={label}
      hint={hint}
      optional={optional}
      invalid={fieldState.invalid}
      error={fieldState.error}
    >
      <Input
        {...input}
        {...field}
        id={id}
        aria-invalid={fieldState.invalid}
        aria-describedby={fieldState.invalid ? errorIdOf(id) : undefined}
        onChange={(event) =>
          field.onChange(normalize ? normalize(event.target.value) : event.target.value)
        }
      />
    </FieldFrame>
  );
}

/** A secret (PIN, password, technical key) that stays hidden unless the person asks to see it. */
export function SecretField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  optional,
  ...input
}: FieldProps<T> & Omit<ComponentProps<typeof Input>, "name" | "id" | "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const { field, fieldState } = useController({ control, name });
  return (
    <FieldFrame
      id={id}
      label={label}
      hint={hint}
      optional={optional}
      invalid={fieldState.invalid}
      error={fieldState.error}
    >
      <div className="flex items-center gap-2">
        <Input
          {...input}
          {...field}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={fieldState.invalid}
          aria-describedby={fieldState.invalid ? errorIdOf(id) : undefined}
        />
        <Button
          type="button"
          variant="outline"
          aria-controls={id}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? "Ocultar" : "Mostrar"}
        </Button>
      </div>
    </FieldFrame>
  );
}

const isoFormat = "yyyy-MM-dd";
// Resolutions and their validity fall well within these years.
const firstMonth = new Date(2000, 0);
const lastMonth = new Date(2050, 11);

/** A date picked from a calendar. The value is an ISO date (YYYY-MM-DD), as the API expects it. */
export function DateField<T extends FieldValues>({ control, name, label, hint }: FieldProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const { field, fieldState } = useController({ control, name });
  const value: string = field.value ?? "";
  const selected = value ? parseISO(value) : undefined;
  return (
    <FieldFrame
      id={id}
      label={label}
      hint={hint}
      invalid={fieldState.invalid}
      error={fieldState.error}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              // oxlint-disable-next-line shadcn/no-restyle -- a picker trigger reads as a field value, not an action
              className="w-full justify-between font-normal"
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.invalid ? errorIdOf(id) : undefined}
              onBlur={field.onBlur}
            />
          }
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="text-muted-foreground" />
            {value || <span className="text-muted-foreground">Selecciona una fecha</span>}
          </span>
          <ChevronDownIcon className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={es}
            captionLayout="dropdown"
            startMonth={firstMonth}
            endMonth={lastMonth}
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              field.onChange(date ? format(date, isoFormat) : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </FieldFrame>
  );
}
