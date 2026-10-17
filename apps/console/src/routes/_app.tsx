import { Link, Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { getSession } from "~/features/session/server";
import { authClient } from "~/lib/auth/client";

/** Protected layout: every child route requires a session. */
export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/sign-in" });
    }
    return { session };
  },
  component: AppLayout,
});

function AppLayout() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

  async function signOut() {
    await authClient.signOut();
    await navigate({ to: "/sign-in" });
  }

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Principal">
        <p className="brand">Cetus</p>
        <ul>
          <li>
            <Link to="/overview" activeProps={{ className: "active" }}>
              Resumen
            </Link>
          </li>
          <li>
            <Link to="/developers/api-keys" activeProps={{ className: "active" }}>
              Llaves de API
            </Link>
          </li>
        </ul>
        <div className="sidebar-footer">
          <p className="who">{session.user.email}</p>
          <button className="button ghost" type="button" onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
