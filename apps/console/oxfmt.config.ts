import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  sortImports: true,
  sortTailwindcss: {
    stylesheet: "./src/styles.css",
    functions: ["cn", "cva"],
  },
  sortPackageJson: true,
  ignorePatterns: [
    "src/routeTree.gen.ts",
    "src/lib/api/schema.d.ts",
    "src/lib/auth/schema.ts",
    "auth-migrations/**",
    "pnpm-lock.yaml",
  ],
});
