import { cn } from "cn";
import { RotateCcwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { docsUrl } from "~/lib/docs";

import { CodeBlock } from "./CodeBlock";
import type { SnippetName } from "./snippets";

type Line = {
  at: number;
  kind: "command" | "response" | "step" | "rejection" | "rule" | "event";
  text: string;
};

type Outcome = "accepted" | "rejected";

const outcomes: readonly Outcome[] = ["accepted", "rejected"];

const command: Line = {
  at: 0,
  kind: "command",
  text: "$ curl -X POST https://cetus-api.cantte.com/v1/invoices -d @factura.json",
};

const processing: readonly Line[] = [
  { at: 1300, kind: "step", text: "✓ XML UBL 2.1 generado, con totales e impuestos calculados" },
  { at: 1900, kind: "step", text: "✓ Firmado con XAdES-EPES y tu certificado" },
  { at: 2500, kind: "step", text: "✓ Enviado a la DIAN" },
];

const scripts: Record<
  Outcome,
  { label: string; lines: readonly Line[]; event: string; snippet: SnippetName }
> = {
  accepted: {
    label: "Aceptada",
    event: "invoice.accepted",
    snippet: "webhookPayload",
    lines: [
      command,
      { at: 700, kind: "response", text: "← 202 Accepted · FE1024 · RECEIVED" },
      ...processing,
      { at: 3300, kind: "step", text: "✓ Aceptado por la DIAN · CUFE 6ed9a8e5…4c057918" },
      {
        at: 3900,
        kind: "event",
        text: "→ webhook invoice.accepted a https://tu-app.com/webhooks · 200",
      },
      {
        at: 4500,
        kind: "event",
        text: "→ PDF y AttachedDocument enviados al correo del cliente · document.delivered",
      },
    ],
  },
  rejected: {
    label: "Rechazada",
    event: "invoice.rejected",
    snippet: "webhookRejectedPayload",
    lines: [
      command,
      { at: 700, kind: "response", text: "← 202 Accepted · FE1025 · RECEIVED" },
      ...processing,
      { at: 3300, kind: "rejection", text: "✗ Rechazado por la DIAN · 99" },
      {
        at: 3600,
        kind: "rule",
        text: "  FAK26   Responsabilidad informada para receptor no valida según lista.",
      },
      {
        at: 3900,
        kind: "rule",
        text: "  FAB10a  El prefijo de numeración no es igual al código de la sucursal…",
      },
      {
        at: 4500,
        kind: "event",
        text: "→ webhook invoice.rejected a https://tu-app.com/webhooks · 200",
      },
    ],
  },
};

const lineTone: Record<Line["kind"], string> = {
  command: "text-foreground",
  response: "text-info-foreground",
  step: "text-success-foreground",
  rejection: "font-medium text-destructive-foreground",
  rule: "text-foreground",
  event: "text-muted-foreground",
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Both answers the DIAN can give the same request; each plays once when it comes into view. */
export function RequestDemo({ payloadHtml }: { payloadHtml: Record<Outcome, string> }) {
  const [outcome, setOutcome] = useState<Outcome>("accepted");

  return (
    <Tabs
      value={outcome}
      onValueChange={(value) => {
        const next = outcomes.find((each) => each === value);
        if (next) {
          setOutcome(next);
        }
      }}
    >
      <TabsList aria-label="Respuesta de la DIAN">
        {outcomes.map((each) => (
          <TabsTrigger key={each} value={each}>
            {scripts[each].label}
          </TabsTrigger>
        ))}
      </TabsList>
      {outcomes.map((each) => (
        <TabsContent key={each} value={each} className="mt-2">
          <div className="flex flex-col gap-3">
            <OutcomeDemo outcome={each} payloadHtml={payloadHtml[each]} />
            {each === "rejected" && (
              <p className="max-w-prose text-md/6 text-pretty text-muted-foreground">
                Cetus no esconde el rechazo: te da la regla de la DIAN y su motivo para que corrijas
                y emitas de nuevo. En simulación, el adquiriente{" "}
                <code className="font-mono text-sm text-foreground">1000000002</code> recibe esta
                respuesta.{" "}
                <a
                  href={`${docsUrl}/inicio-rapido/desarrolladores#practica-los-casos-difíciles`}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Ver los casos de prueba
                </a>
              </p>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Rendered complete on the server and without JavaScript. */
function OutcomeDemo({ outcome, payloadHtml }: { outcome: Outcome; payloadHtml: string }) {
  const { lines, event, snippet } = scripts[outcome];
  const [shown, setShown] = useState(lines.length);
  const [run, setRun] = useState(0);
  const terminal = useRef<HTMLDivElement>(null);

  function replay() {
    if (prefersReducedMotion()) {
      setShown(lines.length);
      return;
    }
    setShown(0);
    setRun((count) => count + 1);
  }

  useEffect(() => {
    const startedAt = performance.now();
    const interval = setInterval(() => {
      if (run === 0) {
        clearInterval(interval);
        return;
      }
      const count = lines.filter((line) => line.at <= performance.now() - startedAt).length;
      setShown(count);
      if (count === lines.length) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [run, lines]);

  useEffect(() => {
    const element = terminal.current;
    const observer =
      element === null || prefersReducedMotion()
        ? null
        : new IntersectionObserver(
            ([entry], self) => {
              if (entry?.isIntersecting) {
                self.disconnect();
                setShown(0);
                setRun((count) => count + 1);
              }
            },
            { threshold: 0.6 },
          );
    if (element !== null) {
      observer?.observe(element);
    }
    return () => observer?.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div
        ref={terminal}
        className="flex min-h-72 min-w-0 flex-col overflow-hidden rounded-xl border bg-card lg:col-span-3"
      >
        <div className="flex items-center justify-between gap-2 border-b py-1.5 pr-1.5 pl-4 text-xs text-muted-foreground">
          <span className="font-mono">Terminal</span>
          <Button variant="ghost" size="xs" onClick={replay}>
            <RotateCcwIcon data-icon="inline-start" />
            Repetir
          </Button>
        </div>
        <ol className="flex flex-col gap-1.5 overflow-x-auto p-4 font-mono text-xs/relaxed">
          {lines.map((line, index) => (
            <li
              key={line.text}
              className={cn(
                "whitespace-pre",
                index < shown
                  ? cn("motion-safe:animate-in motion-safe:fade-in", lineTone[line.kind])
                  : "invisible",
              )}
            >
              {line.text}
            </li>
          ))}
        </ol>
      </div>
      <div className="min-w-0 lg:col-span-2">
        <CodeBlock
          html={payloadHtml}
          snippet={snippet}
          title={`Webhook · ${event}`}
          copyLabel="Copiar el webhook"
        />
      </div>
    </div>
  );
}
