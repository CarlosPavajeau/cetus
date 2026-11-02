// Fails the build when an error code of the public API has no entry in the error catalog, the page each
// error's `type` links to.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const spec = JSON.parse(readFileSync(join(root, "public", "openapi.public.json"), "utf8"));
const catalog = readFileSync(join(root, "content", "docs", "errores.mdx"), "utf8");

const responses = Object.values(spec.components?.responses ?? {});
const codes = new Set(
    responses.flatMap((response) =>
        // Each description names its codes before a colon: "`not_found`: …" or "- `lines_required`, `amount_too_large`: …".
        [...(response.description ?? "").matchAll(/((?:`[a-z][a-z0-9_]*`(?:, )?)+):/g)].flatMap(
            (match) => [...match[1].matchAll(/`([a-z0-9_]+)`/g)].map((code) => code[1]),
        ),
    ),
);
const entries = new Set([...catalog.matchAll(/^#### `([a-z0-9_]+)`$/gm)].map((match) => match[1]));

const missing = [...codes]
    .filter((code) => !entries.has(code))
    .toSorted((a, b) => a.localeCompare(b));
if (missing.length > 0) {
    console.error(
        `The error catalog (content/docs/errores.mdx) has no entry for: ${missing.join(", ")}`,
    );
    process.exit(1);
}
console.log(`Error catalog covers the ${codes.size} codes of the public API.`);
