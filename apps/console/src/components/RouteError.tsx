import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
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

export function RouteError() {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

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
export function ShellError() {
  return (
    <div className="flex min-h-svh items-center p-4">
      <RouteError />
    </div>
  );
}
