import { CopyButton } from "~/components/CopyButton";

/** Code highlighted on the server (highlight.ts), with its plain text for the copy button. */
export function CodeBlock({
  html,
  code,
  title,
  copyLabel,
  lineNumbers = false,
}: {
  html: string;
  code: string;
  title: string;
  copyLabel: string;
  lineNumbers?: boolean;
}) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border bg-card text-left">
      <figcaption className="flex items-center justify-between gap-2 border-b py-1.5 pr-1.5 pl-4 text-xs text-muted-foreground">
        <span className="font-mono">{title}</span>
        <CopyButton value={code} label={copyLabel} iconOnly />
      </figcaption>
      <div
        data-line-numbers={lineNumbers || undefined}
        className="code-block overflow-x-auto p-4 font-mono text-xs/relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  );
}
