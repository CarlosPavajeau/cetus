import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { CircleAlertIcon } from "lucide-react";
import * as React from "react";

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 sm:has-data-[slot=alert-action]:grid-cols-[1fr_auto] sm:has-data-[slot=alert-action]:gap-x-4 sm:has-[>svg]:has-data-[slot=alert-action]:grid-cols-[auto_1fr_auto] *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive-foreground *:data-[slot=alert-description]:text-sm *:data-[slot=alert-description]:text-destructive-foreground dark:border-destructive/30 dark:bg-destructive/20",
      },
      size: {
        default: "",
        lg: "gap-y-1.25 p-5 has-[>svg]:gap-x-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Alert({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    >
      {variant === "destructive" && <CircleAlertIcon aria-hidden="true" />}
      {children}
    </div>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-1 font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-1 text-xs text-balance text-muted-foreground group-has-[>svg]/alert:col-start-2 md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "mt-2 group-has-[>svg]/alert:col-start-2 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:self-center sm:group-has-[>svg]/alert:col-start-3",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
