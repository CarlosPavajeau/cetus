import { cn } from "cn";
import { RotateCcwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";

import { CodeBlock } from "./CodeBlock";

type Line = { at: number; kind: "command" | "response" | "step" | "event"; text: string };

const lines: readonly Line[] = [
  {
    at: 0,
    kind: "command",
    text: "$ curl -X POST https://cetus-api.cantte.com/v1/invoices -d @factura.json",
  },
  { at: 700, kind: "response", text: "← 202 Accepted · FE1024 · RECEIVED" },
  { at: 1300, kind: "step", text: "✓ XML UBL 2.1 generado, con totales e impuestos calculados" },
  { at: 1900, kind: "step", text: "✓ Firmado con XAdES-EPES y tu certificado" },
  { at: 2500, kind: "step", text: "✓ Enviado a la DIAN" },
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
];

const lineTone: Record<Line["kind"], string> = {
  command: "text-foreground",
  response: "text-info-foreground",
  step: "text-success-foreground",
  event: "text-muted-foreground",
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Plays once when it scrolls into view; rendered complete on the server and without JavaScript. */
export function RequestDemo({ webhookPayloadHtml }: { webhookPayloadHtml: string }) {
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
  }, [run]);

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
          html={webhookPayloadHtml}
          snippet="webhookPayload"
          title="Webhook · invoice.accepted"
          copyLabel="Copiar el webhook"
        />
      </div>
    </div>
  );
}
