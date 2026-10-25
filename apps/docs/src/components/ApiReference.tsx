import { ApiReferenceReact } from "@scalar/api-reference-react";

import "@scalar/api-reference-react/style.css";
import { useTheme } from "next-themes";

/** Scalar renders in the browser only; the reference route loads this module lazily. */
export default function ApiReference() {
  const { resolvedTheme } = useTheme();
  const apiUrl = import.meta.env.VITE_API_URL;

  return (
    <ApiReferenceReact
      configuration={{
        url: "/openapi.public.json",
        theme: "none",
        withDefaultFonts: false,
        hideDarkModeToggle: true,
        forceDarkModeState: resolvedTheme === "dark" ? "dark" : "light",
        showDeveloperTools: "never",
        telemetry: false,
        localization: { locale: "es" },
        agent: { disabled: true },
        mcp: { disabled: true },
        persistAuth: false,
        documentDownloadType: "json",
        ...(apiUrl ? { servers: [{ url: apiUrl, description: "Local" }] } : {}),
        authentication: {
          preferredSecurityScheme: "apiKey",
          securitySchemes: { apiKey: { token: "cetus_sandbox_" } },
        },
        defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
        // Keeps the languages our customers use: cURL, Node.js, JavaScript, Python, PHP, Java and C#.
        hiddenClients: {
          c: true,
          clojure: true,
          dart: true,
          fsharp: true,
          go: true,
          http: true,
          kotlin: true,
          objc: true,
          ocaml: true,
          powershell: true,
          r: true,
          ruby: true,
          rust: true,
          swift: true,
        },
      }}
    />
  );
}
