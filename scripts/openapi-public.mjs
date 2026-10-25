#!/usr/bin/env node
// Writes the public OpenAPI spec that the docs site publishes: the integrator API (/v1/**) and only the
// components, tags and security schemes it references. The console keeps generating its types from the full
// spec, which also describes /console/** and /admin/**.
//
//   node scripts/openapi-public.mjs [full-spec.json] [public-spec.json]

import { readFileSync, writeFileSync } from "node:fs";

const source = process.argv[2] ?? "apps/api/build/openapi/openapi.json";
const target = process.argv[3] ?? "apps/docs/public/openapi.public.json";
const PUBLIC_PREFIX = "/v1/";

const full = JSON.parse(readFileSync(source, "utf8"));

const paths = Object.fromEntries(
  Object.entries(full.paths).filter(([path]) => path.startsWith(PUBLIC_PREFIX)),
);
if (Object.keys(paths).length === 0) {
  throw new Error(`${source} has no ${PUBLIC_PREFIX} paths`);
}

// Follows every $ref from the public paths until no new component turns up.
const referenced = new Set();
const pending = [paths];
while (pending.length > 0) {
  const node = pending.pop();
  if (Array.isArray(node)) {
    pending.push(...node);
    continue;
  }
  if (node === null || typeof node !== "object") {
    continue;
  }
  if (typeof node.$ref === "string" && !referenced.has(node.$ref)) {
    referenced.add(node.$ref);
    pending.push(resolve(node.$ref));
  }
  pending.push(...Object.values(node));
}

const components = {};
for (const ref of [...referenced].sort()) {
  const [kind, name] = ref.replace("#/components/", "").split("/");
  components[kind] ??= {};
  components[kind][name] = full.components[kind][name];
}

const operations = Object.values(paths).flatMap((item) => Object.values(item));
const schemeNames = new Set(
  operations.flatMap((operation) => (operation.security ?? []).flatMap((rule) => Object.keys(rule))),
);
components.securitySchemes = Object.fromEntries(
  [...schemeNames].sort().map((name) => {
    const scheme = full.components.securitySchemes?.[name];
    if (scheme === undefined) {
      throw new Error(`Security scheme ${name} is not defined`);
    }
    return [name, scheme];
  }),
);

const tagNames = new Set(operations.flatMap((operation) => operation.tags ?? []));
const tags = (full.tags ?? []).filter((tag) => tagNames.has(tag.name));
const undescribed = [...tagNames].filter((name) => !tags.some((tag) => tag.name === name));
if (undescribed.length > 0) {
  throw new Error(`Tags without a description in META-INF/openapi.yaml: ${undescribed.join(", ")}`);
}

const spec = {
  openapi: full.openapi,
  info: full.info,
  servers: full.servers,
  tags,
  paths,
  components,
};
const leaked = JSON.stringify(spec).match(/"\/(console|admin|internal|q)\//);
if (leaked) {
  throw new Error(`The public spec mentions a private path: ${leaked[0]}`);
}

writeFileSync(target, `${JSON.stringify(spec, null, 2)}\n`);
console.log(
  `${target}: ${Object.keys(paths).length} paths, ${Object.keys(components.schemas ?? {}).length} schemas`,
);

function resolve(ref) {
  const [kind, name] = ref.replace("#/components/", "").split("/");
  const component = full.components[kind]?.[name];
  if (component === undefined) {
    throw new Error(`Unresolved ${ref}`);
  }
  return component;
}
