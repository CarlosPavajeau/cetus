import { useRouteContext } from "@tanstack/react-router";

type ImpersonatedSession = {
  user: { id: string; email: string };
  impersonatedBy: string | null;
  expiresAt: string;
};

/**
 * The session when a Cetus admin is acting as this user, or null. Read from the closest route context
 * that holds the session (the console layout or the setup assistant).
 */
export function useImpersonation(): ImpersonatedSession | null {
  const context = useRouteContext({ strict: false }) as { session?: ImpersonatedSession | null };
  return context.session?.impersonatedBy ? context.session : null;
}
