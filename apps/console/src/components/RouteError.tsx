import * as Sentry from "@sentry/tanstackstart-react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { TriangleAlertIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";

export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  // The router catches it, so Sentry would never see it otherwise.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // Suspense queries rethrow a cached error until their boundary is reset, so a retry would fail at once.
  useEffect(() => {
    queryErrorResetBoundary.reset();
  }, [queryErrorResetBoundary]);

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>No pudimos cargar esta página</EmptyTitle>
        <EmptyDescription>Revisa tu conexión e inténtalo de nuevo.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => router.invalidate()}>Intentar de nuevo</Button>
      </EmptyContent>
    </Empty>
  );
}

/** For a failure above the app shell, where no layout pads the page. */
export function ShellError(props: ErrorComponentProps) {
  return (
    <div className="flex min-h-svh items-center p-4">
      <RouteError {...props} />
    </div>
  );
}
