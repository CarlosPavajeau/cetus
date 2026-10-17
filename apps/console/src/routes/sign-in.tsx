import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { AuthLayout } from "~/components/AuthLayout";
import { authClient } from "~/lib/auth/client";

export const Route = createFileRoute("/sign-in")({
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (signInError) {
      setPending(false);
      setError("El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.");
      return;
    }

    // Make sure there is an active organization: the API scopes everything by it.
    const { data: organizations } = await authClient.organization.list();
    const first = organizations?.[0];
    if (first) {
      await authClient.organization.setActive({ organizationId: first.id });
    }
    await navigate({ to: "/overview" });
  }

  return (
    <AuthLayout title="Inicia sesión" lead="Entra para gestionar tus emisores, llaves y documentos.">
      <form className="form" onSubmit={onSubmit}>
        <label>
          Correo
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>
      <p className="switch">
        ¿Aún no tienes cuenta? <Link to="/sign-up">Crea una</Link>
      </p>
    </AuthLayout>
  );
}
