/** Where the console lives; the guides send readers there to sign up and to create their keys. */
export const consoleUrl = import.meta.env.VITE_CONSOLE_URL ?? "https://cetus.cantte.com";

/** The public API; the status page reads its /status from the browser. */
export const apiUrl = import.meta.env.VITE_API_URL ?? "https://cetus-api.cantte.com";
