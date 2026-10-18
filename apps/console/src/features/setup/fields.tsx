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
};

/** Label, control, hint and error of one form field, laid out as in the assistant's design. */
function FieldFrame({
  id,
  label,
  hint,
  invalid,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  invalid: boolean;
  error?: { message?: string };
  children: ReactNode;
}) {
  return (
    <Field data-invalid={invalid} className="gap-1.75">
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      {children}
      {hint && !invalid && <FieldDescription className="text-[10px]">{hint}</FieldDescription>}
      <FieldError errors={[error]} className="text-[10px]" />
    </Field>
  );
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  ...input
}: FieldProps<T> & Omit<ComponentProps<typeof Input>, "name" | "id">) {
  const id = useId();
  const { field, fieldState } = useController({ control, name });
  return (
    <FieldFrame
      id={id}
      label={label}
      hint={hint}
      invalid={fieldState.invalid}
      error={fieldState.error}
    >
      <Input {...input} {...field} id={id} aria-invalid={fieldState.invalid} />
    </FieldFrame>
  );
}

/** A secret (PIN, password, technical key) that stays hidden unless the person asks to see it. */
export function SecretField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
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
              className="w-full justify-between font-normal"
              aria-invalid={fieldState.invalid}
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
