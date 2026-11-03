import { CopyButton } from "~/components/CopyButton";

import { track } from "./analytics";
import { type SnippetName, snippets } from "./snippets";

/** A snippet highlighted on the server (highlight.ts), with its plain text for the copy button. */
export function CodeBlock({
  html,
  snippet,
  title,
  copyLabel,
  lineNumbers = false,
}: {
  html: string;
  snippet: SnippetName;
  title: string;
  copyLabel: string;
  lineNumbers?: boolean;
}) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border bg-card text-left">
      <figcaption className="flex items-center justify-between gap-2 border-b py-1.5 pr-1.5 pl-4 text-xs text-muted-foreground">
        <span className="font-mono">{title}</span>
        <CopyButton
          value={snippets[snippet].code}
          label={copyLabel}
          iconOnly
          onCopy={() => track({ name: "copy_snippet", snippet })}
        />
      </figcaption>
      <div
        data-line-numbers={lineNumbers || undefined}
        className="code-block overflow-x-auto p-4 font-mono text-xs/relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  );
}
