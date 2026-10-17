import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { AuthLayout } from "~/components/AuthLayout";
import { bootstrapAccount } from "~/features/account/server";
import { authClient } from "~/lib/auth/client";

export const Route = createFileRoute("/sign-up")({
  component: SignUp,
});

function slugify(value: string) {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "empresa"}-${Math.random().toString(36).slice(2, 6)}`;
}

function SignUp() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const company = String(form.get("company"));
    setPending(true);
    setError(null);

    const { error: signUpError } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (signUpError) {
      setPending(false);
      setError(signUpError.message ?? "No pudimos crear la cuenta. Revisa los datos.");
      return;
    }

    // 1. Organization in Better Auth  2. Make it active  3. Matching account in the Java API
    const { data: organization, error: orgError } = await authClient.organization.create({
      name: company,
      slug: slugify(company),
    });
    if (orgError || !organization) {
      setPending(false);
      setError("Tu usuario quedó creado, pero no la empresa. Inicia sesión para terminar.");
      return;
    }
    await authClient.organization.setActive({ organizationId: organization.id });
    await bootstrapAccount({ data: { name: company } });
    await navigate({ to: "/overview" });
  }

  return (
    <AuthLayout title="Crea tu cuenta" lead="Empieza en el ambiente de pruebas; pasar a producción es un cambio de llave.">
      <form className="form" onSubmit={onSubmit}>
        <label>
          Tu nombre
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          Empresa
          <input name="company" autoComplete="organization" required />
        </label>
        <label>
          Correo de trabajo
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete="new-password" minLength={10} required />
          <span className="hint">Mínimo 10 caracteres.</span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
      <p className="switch">
        ¿Ya tienes cuenta? <Link to="/sign-in">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}
