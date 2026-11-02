import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { CircleAlertIcon, CircleCheckIcon, CircleXIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { baseOptions } from "~/lib/layout";
import { apiUrl } from "~/lib/site";
import {
  type Component,
  type ComponentStatus,
  type Incident,
  type PlatformStatus,
  parseStatus,
} from "~/lib/status";

export const Route = createFileRoute("/estado")({
  component: StatusPage,
  head: () => ({
    meta: [
      { title: "Estado · Cetus" },
      {
        name: "description",
        content: "Disponibilidad de Cetus y de los servicios de la DIAN, e incidentes recientes.",
      },
    ],
  }),
});

const REFRESH_MS = 60_000;

type Load =
  | { state: "loading" }
  | { state: "loaded"; status: PlatformStatus }
  | { state: "unreachable" };

const groups: { title: string; components: { id: Component; label: string; hint: string }[] }[] = [
  {
    title: "Cetus",
    components: [
      { id: "API", label: "API", hint: "Recibe y valida los documentos." },
      {
        id: "PROCESSING",
        label: "Procesamiento",
        hint: "Firma los documentos, los envía a la DIAN y los entrega por correo y webhooks.",
      },
    ],
  },
  {
    title: "DIAN",
    components: [
      { id: "DIAN_LIVE", label: "Producción", hint: "Documentos con validez fiscal." },
      { id: "DIAN_TEST", label: "Habilitación", hint: "Pruebas de habilitación ante la DIAN." },
    ],
  },
];

const componentLabel: Record<Component, string> = {
  API: "API",
  PROCESSING: "Procesamiento",
  DIAN_LIVE: "DIAN · producción",
  DIAN_TEST: "DIAN · habilitación",
};

const statusLabel: Record<ComponentStatus, string> = {
  OPERATIONAL: "Operativo",
  DEGRADED: "Con fallas",
  OUTAGE: "Caído",
};

const dateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

function StatusPage() {
  const load = useStatus();
  const status = load.state === "loaded" ? load.status : null;
  const statusOf = (component: Component): ComponentStatus | null => {
    if (load.state === "unreachable") {
      return component === "API" ? "OUTAGE" : null;
    }
    return status?.components.find((each) => each.component === component)?.status ?? null;
  };
  const open = status?.incidents.filter((incident) => incident.resolvedAt === null) ?? [];
  const resolved = status?.incidents.filter((incident) => incident.resolvedAt !== null) ?? [];

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Estado</h1>
          <p className="text-fd-muted-foreground">
            Cuando la DIAN falla, Cetus guarda los documentos y los envía en cuanto vuelve a
            responder: no tienes que emitirlos de nuevo.
          </p>
          <Summary load={load} />
        </header>

        {open.length > 0 && <Incidents title="Incidentes en curso" incidents={open} />}

        {groups.map((group) => (
          <section key={group.title} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <ul className="divide-y rounded-lg border">
              {group.components.map((component) => (
                <li key={component.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex flex-col">
                    <span className="font-medium">{component.label}</span>
                    <span className="text-sm text-fd-muted-foreground">{component.hint}</span>
                  </div>
                  <StatusBadge status={statusOf(component.id)} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {resolved.length > 0 && (
          <Incidents title="Resueltos en los últimos 7 días" incidents={resolved} />
        )}
      </main>
    </HomeLayout>
  );
}

function useStatus(): Load {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  useEffect(() => {
    let controller = new AbortController();
    const refresh = async () => {
      controller.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`${apiUrl}/status`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        setLoad({ state: "loaded", status: parseStatus(await response.json()) });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Could not read the status", error);
          setLoad({ state: "unreachable" });
        }
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, []);
  return load;
}

function Summary({ load }: { load: Load }) {
  if (load.state === "loading") {
    return <p className="text-sm text-fd-muted-foreground">Consultando…</p>;
  }
  if (load.state === "unreachable") {
    return (
      <p className="flex items-center gap-2 font-medium text-red-700 dark:text-red-400">
        <CircleXIcon className="size-5 shrink-0" aria-hidden />
        La API de Cetus no responde.
      </p>
    );
  }
  const failing = load.status.components.filter((each) => each.status !== "OPERATIONAL");
  return (
    <div className="flex flex-col gap-1">
      {failing.length === 0 ? (
        <p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
          <CircleCheckIcon className="size-5 shrink-0" aria-hidden />
          Todo funciona con normalidad.
        </p>
      ) : (
        <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
          <CircleAlertIcon className="size-5 shrink-0" aria-hidden />
          {failing.map((each) => componentLabel[each.component]).join(", ")}{" "}
          {failing.length === 1 ? "presenta fallas." : "presentan fallas."}
        </p>
      )}
      <p className="text-xs text-fd-muted-foreground">
        Actualizado: {dateTime.format(new Date(load.status.checkedAt))}
      </p>
    </div>
  );
}

const badgeTone: Record<ComponentStatus, string> = {
  OPERATIONAL: "text-emerald-700 dark:text-emerald-400",
  DEGRADED: "text-amber-700 dark:text-amber-400",
  OUTAGE: "text-red-700 dark:text-red-400",
};

const badgeIcon: Record<ComponentStatus, typeof CircleCheckIcon> = {
  OPERATIONAL: CircleCheckIcon,
  DEGRADED: CircleAlertIcon,
  OUTAGE: CircleXIcon,
};

function StatusBadge({ status }: { status: ComponentStatus | null }) {
  if (status === null) {
    return <span className="text-sm text-fd-muted-foreground">Sin datos</span>;
  }
  const Icon = badgeIcon[status];
  return (
    <span className={`flex shrink-0 items-center gap-1.5 text-sm font-medium ${badgeTone[status]}`}>
      <Icon className="size-4" aria-hidden />
      {statusLabel[status]}
    </span>
  );
}

function Incidents({ title, incidents }: { title: string; incidents: Incident[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="flex flex-col gap-3">
        {incidents.map((incident) => (
          <li key={incident.id} className="flex flex-col gap-1 rounded-lg border p-4">
            <span className="font-medium">{incident.title}</span>
            <p className="text-sm">{incident.message}</p>
            <span className="text-xs text-fd-muted-foreground">
              {componentLabel[incident.component]} · desde{" "}
              {dateTime.format(new Date(incident.startedAt))}
              {incident.resolvedAt !== null &&
                ` · resuelto ${dateTime.format(new Date(incident.resolvedAt))}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
