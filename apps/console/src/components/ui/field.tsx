import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { createContext, useContext, useEffect, useId, useMemo, useState } from "react";

import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className,
      )}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
        className,
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

type FieldSize = "default" | "sm" | "xs";

const fieldVariants = cva("group/field flex w-full gap-2 data-[invalid=true]:text-destructive", {
  variants: {
    size: {
      default: "",
      sm: "",
      xs: "gap-1.75",
    },
    orientation: {
      vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
      horizontal:
        "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      responsive:
        "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
    },
  },
  defaultVariants: {
    orientation: "vertical",
    size: "default",
  },
});

type FieldDescriptions = {
  idDescription: string | undefined;
  idError: string | undefined;
  setIdDescription: (id: string | undefined) => void;
  setIdError: (id: string | undefined) => void;
};

const FieldDescriptionsContext = createContext<FieldDescriptions | null>(null);

/**
 * The ids of the hint and the error rendered inside the enclosing `Field`, for its control's
 * `aria-describedby`. A `describedBy` passed by the caller wins.
 */
function useFieldDescribedBy(describedBy: string | undefined) {
  const field = useContext(FieldDescriptionsContext);
  if (describedBy !== undefined || !field) {
    return describedBy;
  }
  const ids = [field.idDescription, field.idError].filter((id) => id !== undefined);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function useFieldDescriptionId(
  id: string | undefined,
  slot: "description" | "error",
  rendered: boolean,
) {
  const field = useContext(FieldDescriptionsContext);
  const idGenerated = useId();
  const idResolved = id ?? `${idGenerated}-${slot}`;
  const register = field && (slot === "description" ? field.setIdDescription : field.setIdError);

  useEffect(() => {
    const registered = rendered ? register : null;
    registered?.(idResolved);
    return () => registered?.(undefined);
  }, [register, rendered, idResolved]);

  return idResolved;
}

function Field({
  className,
  orientation = "vertical",
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  const [idDescription, setIdDescription] = useState<string | undefined>();
  const [idError, setIdError] = useState<string | undefined>();
  const descriptions = useMemo(
    () => ({ idDescription, idError, setIdDescription, setIdError }),
    [idDescription, idError],
  );

  return (
    <FieldDescriptionsContext.Provider value={descriptions}>
      <div
        role="group"
        data-slot="field"
        data-orientation={orientation}
        data-size={size}
        className={cn(fieldVariants({ orientation, size }), className)}
        {...props}
      />
    </FieldDescriptionsContext.Provider>
  );
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("group/field-content flex flex-1 flex-col gap-0.5 leading-snug", className)}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof Label> & { size?: FieldSize }) {
  return (
    <Label
      data-slot="field-label"
      data-size={size}
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-muted/50 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
        "group-data-[size=xs]/field:text-xs data-[size=xs]:text-xs",
        className,
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({
  className,
  id,
  size = "default",
  ...props
}: React.ComponentProps<"p"> & { size?: FieldSize }) {
  const idResolved = useFieldDescriptionId(id, "description", true);

  return (
    <p
      id={idResolved}
      data-slot="field-description"
      data-size={size}
      className={cn(
        "text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
        "last:mt-0 nth-last-2:-mt-1",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        "group-data-[size=sm]/field:text-xs group-data-[size=xs]/field:text-3xs data-[size=sm]:text-xs data-[size=xs]:text-3xs",
        className,
      )}
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        className,
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({
  className,
  children,
  id,
  errors,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
  size?: FieldSize;
}) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];

    if (uniqueErrors?.length === 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
      </ul>
    );
  }, [children, errors]);
  const idResolved = useFieldDescriptionId(id, "error", Boolean(content));

  if (!content) {
    return null;
  }

  return (
    <div
      id={idResolved}
      data-slot="field-error"
      data-size={size}
      className={cn(
        "text-sm font-normal text-destructive",
        "group-data-[size=sm]/field:text-xs group-data-[size=xs]/field:text-3xs data-[size=sm]:text-xs data-[size=xs]:text-3xs",
        className,
      )}
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
  useFieldDescribedBy,
};
