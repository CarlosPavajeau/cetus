import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Bind IPv4 explicitly: Node resolves "localhost" to ::1, but the Java API fetches the JWKS via 127.0.0.1.
  server: { host: "127.0.0.1", port: 3000 },
  plugins: [tsconfigPaths(), tanstackStart(), viteReact()],
});
