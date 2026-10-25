/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONSOLE_URL?: string;
  /** Overrides the spec's server in the reference, e.g. http://localhost:8080 against a local API. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
