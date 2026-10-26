import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-2xs font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

/**
 * What a status badge can show: nothing yet, a neutral phase, in flight, done, needs attention or
 * failed. `info` and `pending` share a color; only `pending` moves, since only it is in flight.
 */
type BadgeStatus = "idle" | "info" | "pending" | "success" | "warning" | "error";

const statusDotVariants = cva(
  "relative size-1.5 shrink-0 rounded-full transition-[background-color] duration-150 ease-out",
  {
    variants: {
      status: {
        idle: "bg-muted-foreground",
        info: "bg-sky-500",
        // Ping ring under full motion, an opacity pulse under reduced motion.
        pending: "bg-sky-500 motion-reduce:animate-pulse",
        success: "bg-emerald-500",
        warning: "bg-amber-500",
        error: "bg-destructive",
      },
    },
    defaultVariants: {
      status: "idle",
    },
  },
);

/**
 * An outline badge with a colored dot for one {@link BadgeStatus}. Changing `status` retargets the
 * color transitions, so a pending → success swap blends instead of jumping. The label stays the
 * caller's, so the dot is never the only cue.
 */
function StatusBadge({
  status = "idle",
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Badge>, "variant"> & { status?: BadgeStatus }) {
  return (
    <Badge
      variant="outline"
      data-status={status}
      className={cn(status === "idle" && "text-muted-foreground", className)}
      {...props}
    >
      <span data-slot="badge-status-dot" aria-hidden className={statusDotVariants({ status })}>
        {status === "pending" && (
          <span className="absolute inset-0 rounded-full bg-inherit motion-safe:animate-ping" />
        )}
      </span>
      {children}
    </Badge>
  );
}

export { Badge, badgeVariants, StatusBadge, statusDotVariants, type BadgeStatus };
