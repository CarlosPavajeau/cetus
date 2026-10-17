import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { createApiKey, listApiKeys, revokeApiKey } from "~/features/api-keys/server";
import type { Environment } from "~/lib/api/types";

export const Route = createFileRoute("/_app/developers/api-keys")({
  loader: () => listApiKeys(),
  component: ApiKeys,
});

const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

function ApiKeys() {
  const keys = Route.useLoaderData();
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    const created = await createApiKey({
      data: { name: String(data.get("name")), environment: String(data.get("environment")) as Environment },
    });
    setPending(false);
    setSecret(created.secret);
    setCopied(false);
    form.reset();
    await router.invalidate();
  }

  async function onRevoke(id: string, name: string) {
    if (!window.confirm(`¿Revocar la llave "${name}"? Las integraciones que la usen dejarán de funcionar.`)) {
      return;
    }
    await revokeApiKey({ data: { id } });
    await router.invalidate();
  }

  async function copySecret() {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>Llaves de API</h1>
        <p className="lead">
          Cada llave pertenece a un ambiente. Úsala en el encabezado <code>Authorization: Bearer …</code>.
        </p>
      </header>

      {secret && (
        <section className="panel reveal" aria-live="polite">
          <h2>Copia tu llave ahora</h2>
          <p>Por seguridad solo la mostramos una vez. Si la pierdes, revócala y crea otra.</p>
          <div className="secret">
            <code>{secret}</code>
            <button className="button" type="button" onClick={copySecret}>
              {copied ? "Copiada" : "Copiar"}
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Nueva llave</h2>
        <form className="form inline" onSubmit={onCreate}>
          <label>
            Nombre
            <input name="name" placeholder="ERP de producción" maxLength={80} required />
          </label>
          <label>
            Ambiente
            <select name="environment" defaultValue="TEST">
              <option value="TEST">Pruebas (habilitación DIAN)</option>
              <option value="LIVE">Producción</option>
            </select>
          </label>
          <button className="button primary" type="submit" disabled={pending}>
            {pending ? "Creando…" : "Crear llave"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Tus llaves</h2>
        {keys.length === 0 ? (
          <p className="empty">Todavía no hay llaves. Crea una de pruebas para empezar a integrar.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Llave</th>
                <th scope="col">Ambiente</th>
                <th scope="col">Último uso</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className={key.revokedAt ? "revoked" : undefined}>
                  <td>{key.name}</td>
                  <td>
                    <code>{key.prefix}…</code>
                  </td>
                  <td>
                    <span className={`env env-${key.environment.toLowerCase()}`}>
                      {key.environment === "TEST" ? "Pruebas" : "Producción"}
                    </span>
                  </td>
                  <td>{key.lastUsedAt ? dateFormat.format(new Date(key.lastUsedAt)) : "Nunca"}</td>
                  <td className="actions">
                    {key.revokedAt ? (
                      <span className="hint">Revocada</span>
                    ) : (
                      <button className="button danger" type="button" onClick={() => onRevoke(key.id, key.name)}>
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
