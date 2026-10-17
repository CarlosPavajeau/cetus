import { Link, createFileRoute } from "@tanstack/react-router";
import { getAccount } from "~/features/account/server";
import { listIssuers } from "~/features/issuers/server";
import type { Issuer } from "~/lib/api/types";

export const Route = createFileRoute("/_app/overview")({
  loader: async () => {
    const [account, issuers] = await Promise.all([getAccount(), listIssuers()]);
    return { account, issuers };
  },
  component: Overview,
});

const statusLabel: Record<Issuer["status"], string> = {
  ONBOARDING: "Configuración pendiente",
  TESTING: "En habilitación",
  ENABLED: "Habilitado",
  DISABLED: "Deshabilitado",
};

function Overview() {
  const { account, issuers } = Route.useLoaderData();

  return (
    <>
      <header className="page-header">
        <h1>{account.name}</h1>
        <p className="lead">Plan {account.plan.toLowerCase()} · cuenta {account.status.toLowerCase()}</p>
      </header>

      <section className="panel">
        <h2>Emisores</h2>
        {issuers.length === 0 ? (
          <div className="empty">
            <p>
              Aún no tienes emisores. Un emisor es la empresa que factura: su NIT, su certificado de firma y su
              resolución de numeración.
            </p>
            <p className="hint">Por ahora se registran con la API de consola; el asistente visual es el siguiente paso.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Razón social</th>
                <th scope="col">NIT</th>
                <th scope="col">Ambiente</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {issuers.map((issuer) => (
                <tr key={issuer.id}>
                  <td>{issuer.tradeName ?? issuer.legalName}</td>
                  <td className="num">
                    {issuer.nit}-{issuer.checkDigit}
                  </td>
                  <td>
                    <span className={`env env-${issuer.environment.toLowerCase()}`}>
                      {issuer.environment === "TEST" ? "Pruebas" : "Producción"}
                    </span>
                  </td>
                  <td>{statusLabel[issuer.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h2>Integra tu sistema</h2>
        <p>
          Crea una llave de pruebas y envía tu primera factura a <code>POST /v1/invoices</code>. Las llaves de pruebas
          envían a la habilitación de la DIAN; las de producción, a facturación real.
        </p>
        <Link className="button primary" to="/developers/api-keys">
          Crear llave de API
        </Link>
      </section>
    </>
  );
}
