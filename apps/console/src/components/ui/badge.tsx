import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleXIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Spinner } from "~/components/ui/spinner";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-2xs font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive-foreground focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        muted: "border-border text-muted-foreground",
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

const statusBadgeVariants = cva("", {
  variants: {
    status: {
      idle: "bg-secondary text-secondary-foreground",
      info: "bg-info/10 text-info-foreground",
      pending: "bg-info/10 text-info-foreground",
      success: "bg-success/10 text-success-foreground",
      warning: "bg-warning/10 text-warning-foreground",
      error: "bg-destructive/10 text-destructive-foreground dark:bg-destructive/20",
    },
  },
  defaultVariants: {
    status: "idle",
  },
});

const statusIcon: Record<BadgeStatus, React.ReactNode> = {
  idle: <CircleDashedIcon aria-hidden />,
  info: <InfoIcon aria-hidden />,
  pending: <Spinner aria-hidden className="motion-reduce:animate-pulse" />,
  success: <CircleCheckIcon aria-hidden />,
  warning: <TriangleAlertIcon aria-hidden />,
  error: <CircleXIcon aria-hidden />,
};

/** Every status icon stays mounted in one grid cell, so a status change cross-fades both ways. */
function StatusIcon({ status }: { status: BadgeStatus }) {
  return (
    <span
      data-slot="badge-status-icon"
      aria-hidden
      className="grid shrink-0 place-items-center [&_svg]:size-3!"
    >
      {Object.entries(statusIcon).map(([each, icon]) => (
        <span
          key={each}
          className={cn(
            "transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)] [grid-area:1/1] motion-reduce:scale-100 motion-reduce:blur-[0px]",
            each === status
              ? "scale-100 opacity-100 blur-[0px]"
              : "scale-[0.25] opacity-0 blur-[4px] [&_svg]:animate-none",
          )}
        >
          {icon}
        </span>
      ))}
    </span>
  );
}

/**
 * A tinted badge with an icon for one {@link BadgeStatus}. Changing `status` retargets the color
 * transitions and cross-fades the icon, so a pending → success swap blends instead of jumping. The
 * label stays the caller's, so color and icon are never the only cue. `icon` replaces the status
 * icon; `null` hides it.
 */
function StatusBadge({
  status = "idle",
  icon,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Badge>, "variant"> & {
  status?: BadgeStatus;
  icon?: React.ReactNode;
}) {
  return (
    <Badge
      variant={null}
      data-status={status}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {icon === undefined ? <StatusIcon status={status} /> : icon}
      {children}
    </Badge>
  );
}

export { Badge, badgeVariants, StatusBadge, statusBadgeVariants, type BadgeStatus };
