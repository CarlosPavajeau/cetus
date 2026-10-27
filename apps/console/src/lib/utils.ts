export { cn } from "cn";

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The entry for a key the API types as a plain string, or undefined when the record has none. */
export function entryOf<V>(record: Record<string, V>, key: string): V | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

/** The name a detail page gives itself by returning `{ crumb }` from its loader. */
export function crumbOf(loaderData: unknown): string | undefined {
  return typeof loaderData === "object" &&
    loaderData !== null &&
    "crumb" in loaderData &&
    typeof loaderData.crumb === "string"
    ? loaderData.crumb
    : undefined;
}

/**
 * Ends an exhaustive switch over an API enum: the compiler rejects the call while a case is missing, and
 * a value from a newer API than this console is shown as is instead of breaking the page.
 */
export function unknownValue(value: never): string {
  return String(value);
}
