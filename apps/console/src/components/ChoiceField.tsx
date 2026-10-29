import { type ReactNode, useId } from "react";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "~/components/ui/field";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

/**
 * One choice among a few, each as a card with its title and an explanation, so the person reads the
 * options instead of guessing from a closed list.
 */
export function ChoiceField<V extends string>({
  label,
  hint,
  options,
  value,
  disabled,
  error,
  onChange,
  className,
}: {
  label: string;
  hint?: ReactNode;
  options: readonly { value: V; title: string; description: string }[];
  /** Null while nothing is chosen yet. */
  value: V | null;
  disabled?: boolean;
  /** Why the choice is missing or wrong; tied to the group so assistive technology reads it. */
  error?: string;
  onChange: (value: V) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={id} className="text-sm leading-snug font-medium">
        {label}
      </p>
      <RadioGroup
        aria-labelledby={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          const option = options.find((each) => each.value === next);
          if (option) {
            onChange(option.value);
          }
        }}
        className={className}
      >
        {options.map((option) => (
          <FieldLabel key={option.value} htmlFor={`${id}-${option.value}`}>
            <Field orientation="horizontal" size="sm">
              <FieldContent>
                <FieldTitle>{option.title}</FieldTitle>
                <FieldDescription>{option.description}</FieldDescription>
              </FieldContent>
              <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
      {hint && <FieldDescription size="sm">{hint}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}
