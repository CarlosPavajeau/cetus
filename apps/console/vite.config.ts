import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Bind IPv4 explicitly: Node resolves "localhost" to ::1, but the Java API fetches the JWKS via 127.0.0.1.
  server: { host: "127.0.0.1", port: 3000 },
  plugins: lazyPlugins(() => [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    // Last. Uploads hidden source maps and deletes them from the build; without SENTRY_AUTH_TOKEN it skips
    // the upload. Railway passes these to the Docker build (apps/console/Dockerfile).
    sentryTanstackStart({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.RAILWAY_GIT_COMMIT_SHA },
      telemetry: false,
    }),
  ]),
  lint: {
    plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "jsx-a11y", "import", "promise"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    categories: {
      correctness: "error",
      suspicious: "warn",
      perf: "warn",
    },
    env: {
      browser: true,
      node: true,
      es2022: true,
    },
    settings: {
      react: {
        version: "19",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "warn",
      "typescript/consistent-type-imports": "error",
      "typescript/no-explicit-any": "warn",
      "import/no-cycle": "error",
      // Side-effect imports such as "@tanstack/react-start/server-only" are intentional.
      "import/no-unassigned-import": "off",
      "no-underscore-dangle": "off",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    overrides: [
      {
        // Vendored shadcn components: keep them as the registry ships them.
        files: ["src/components/ui/**", "src/hooks/use-mobile.ts"],
        rules: {
          "jsx-a11y/prefer-tag-over-role": "off",
          "jsx-a11y/label-has-associated-control": "off",
          "jsx-a11y/click-events-have-key-events": "off",
          "jsx-a11y/no-noninteractive-element-interactions": "off",
          "react/no-array-index-key": "off",
          "react/set-state-in-effect": "off",
          "no-shadow": "off",
        },
      },
    ],
    ignorePatterns: [
      "dist/**",
      ".tanstack/**",
      "src/routeTree.gen.ts",
      "src/lib/api/schema.d.ts",
      "src/lib/auth/schema.ts",
    ],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
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
  },
});
