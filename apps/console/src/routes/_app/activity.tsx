import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type ActivityEntry, listAuditLog } from "~/features/audit-log/server";
import { type AuditAction, auditActions } from "~/lib/api/types";

type ActivitySearch = { action?: AuditAction };

export const Route = createFileRoute("/_app/activity")({
  validateSearch: (search: Record<string, unknown>): ActivitySearch => ({
    action: auditActions.find((action) => action === search.action),
  }),
  loaderDeps: ({ search }) => ({ action: search.action }),
  loader: ({ deps }) => listAuditLog({ data: { action: deps.action } }),
  component: Activity,
});

const actionLabel: Record<AuditAction, string> = {
  ACCOUNT_CREATED: "Cuenta creada",
  API_KEY_CREATED: "Llave de API creada",
  API_KEY_REVOKED: "Llave de API revocada",
  ISSUER_CREATED: "Emisor creado",
  SOFTWARE_CREDENTIALS_SET: "Software DIAN configurado",
  CERTIFICATE_UPLOADED: "Certificado cargado",
  NUMBERING_RANGE_ADDED: "Rango de numeración agregado",
  ISSUER_STATUS_CHANGED: "Estado del emisor cambiado",
};

const issuerStatusLabel: Record<string, string> = {
  ONBOARDING: "Configuración pendiente",
  TESTING: "En habilitación",
  ENABLED: "Habilitado",
  DISABLED: "Deshabilitado",
};

const environmentLabel: Record<string, string> = { TEST: "Pruebas", LIVE: "Producción" };

const documentTypeLabel: Record<string, string> = {
  INVOICE: "Factura",
  CREDIT_NOTE: "Nota crédito",
  DEBIT_NOTE: "Nota débito",
};

const personTypeLabel: Record<string, string> = {
  LEGAL_ENTITY: "Persona jurídica",
  NATURAL_PERSON: "Persona natural",
};

const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const dayFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function label(labels: Record<string, string>, value: unknown): string {
  return labels[text(value)] ?? text(value);
}

function detail(entry: ActivityEntry): string {
  const data = entry.data;
  switch (entry.action) {
    case "ACCOUNT_CREATED":
      return text(data.name);
    case "API_KEY_CREATED":
    case "API_KEY_REVOKED":
      return `${text(data.name)} · ${text(data.prefix)}… · ${label(environmentLabel, data.environment)}`;
    case "ISSUER_CREATED":
      return `NIT ${text(data.nit)} · ${label(environmentLabel, data.environment)} · ${label(personTypeLabel, data.personType)}`;
    case "SOFTWARE_CREDENTIALS_SET":
      return `Software ${text(data.softwareId)}${data.hasTestSet ? " · con set de pruebas" : ""}`;
    case "CERTIFICATE_UPLOADED":
      return data.validTo
        ? `${text(data.subject)} · vence el ${dayFormat.format(new Date(text(data.validTo)))}`
        : text(data.subject);
    case "NUMBERING_RANGE_ADDED":
      return `${label(documentTypeLabel, data.documentType)} ${text(data.prefix)}${text(data.from)} a ${text(data.prefix)}${text(data.to)}`;
    case "ISSUER_STATUS_CHANGED":
      return `${label(issuerStatusLabel, data.from)} → ${label(issuerStatusLabel, data.to)}`;
  }
}

function actor(entry: ActivityEntry): string {
  switch (entry.actorType) {
    case "USER":
      return entry.actorEmail ?? "Usuario eliminado";
    case "API_KEY":
      return "Llave de API";
    case "SYSTEM":
      return "Cetus";
  }
}

function Activity() {
  const firstPage = Route.useLoaderData();
  const { action } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [entries, setEntries] = useState(firstPage.items);
  const [cursor, setCursor] = useState(firstPage.nextCursor);
  const [pending, setPending] = useState(false);

  // A new filter loads a new first page: drop the pages appended with "Ver más".
  useEffect(() => {
    setEntries(firstPage.items);
    setCursor(firstPage.nextCursor);
  }, [firstPage]);

  async function loadMore() {
    if (cursor === null) {
      return;
    }
    setPending(true);
    try {
      const page = await listAuditLog({ data: { action, before: cursor } });
      setEntries((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>Actividad</h1>
        <p className="lead">
          Cambios sensibles en la cuenta: quién los hizo y cuándo. El registro es permanente y no se puede editar.
        </p>
      </header>

      <section className="panel">
        <form className="form inline" onSubmit={(event) => event.preventDefault()}>
          <label>
            Tipo de acción
            <select
              value={action ?? ""}
              onChange={(event) =>
                navigate({ search: { action: (event.target.value || undefined) as AuditAction | undefined } })
              }
            >
              <option value="">Todas</option>
              {auditActions.map((value) => (
                <option key={value} value={value}>
                  {actionLabel[value]}
                </option>
              ))}
            </select>
          </label>
        </form>
      </section>

      <section className="panel">
        {entries.length === 0 ? (
          <p className="empty">{action ? "No hay actividad de este tipo." : "Todavía no hay actividad registrada."}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Acción</th>
                <th scope="col">Quién</th>
                <th scope="col">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="num">{dateFormat.format(new Date(entry.createdAt))}</td>
                  <td>{actionLabel[entry.action]}</td>
                  <td>
                    {actor(entry)}
                    {entry.ipAddress && <span className="hint block">{entry.ipAddress}</span>}
                  </td>
                  <td>{detail(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {cursor !== null && (
          <p className="more">
            <button className="button" type="button" onClick={loadMore} disabled={pending}>
              {pending ? "Cargando…" : "Ver más"}
            </button>
          </p>
        )}
      </section>
    </>
  );
}
