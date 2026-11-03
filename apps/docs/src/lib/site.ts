/** Where the console lives; the guides send readers there to sign up and to create their keys. */
export const consoleUrl = import.meta.env.VITE_CONSOLE_URL ?? "https://cetus.cantte.com";

/** The sign-up, marked so the console measures the readers who come from the docs. */
export const signUpUrl = `${consoleUrl}/sign-up?ref=docs`;

/** Where the docs are published, for canonical links and Open Graph. */
export const docsSiteUrl = "https://cetus-docs.cantte.com";

/**
 * The status page, hosted on Better Stack so it stays up when Cetus does not. In Spanish like the docs: its bare
 * URL follows the browser's language.
 */
export const statusUrl = "https://status.cantte.com/es";
