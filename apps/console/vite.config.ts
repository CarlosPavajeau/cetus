import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  // Bind IPv4 explicitly: Node resolves "localhost" to ::1, but the Java API fetches the JWKS via 127.0.0.1.
  server: { host: "127.0.0.1", port: 3000 },
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
    // Last. Uploads hidden source maps and deletes them from the build; without SENTRY_AUTH_TOKEN it skips
    // the upload. Railway passes these to the Docker build (apps/console/Dockerfile).
    sentryTanstackStart({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.CETUS_COMMIT_SHA },
      telemetry: false,
    }),
  ]),
  lint: {
    plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "jsx-a11y", "import", "promise"],
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      "@shadcn/lint",
      { name: "react-doctor", specifier: "oxlint-plugin-react-doctor" },
    ],
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
      shadcn: { ui: "~/components/ui" },
    },
    rules: {
      "oxc/no-accumulating-spread": "error",
      "shadcn/no-unknown-classes": "error",
      "shadcn/no-raw-colors": "error",
      "shadcn/require-static-classes": "error",
      "shadcn/no-arbitrary-values": [
        "error",
        {
          allow: [
            "layout",
            "transition",
            "rounded-[inherit]",
            "leading-[normal]",
            "rounded-[25%]",
            "rounded-[calc(var(--radius-md)+3px)]",
          ],
        },
      ],
      "shadcn/no-restyle": [
        "error",
        {
          allow: ["layout"],
          contracts: [
            {
              // CollapsibleTrigger has no styled counterpart; other triggers use render={<Button …/>}.
              pattern: "^CollapsibleTrigger$",
              allow: ["layout", "color", "typography", "spacing", "shape", "effects", "motion"],
            },
            {
              // Cells take per-column typography, tone and edge padding, as in the shadcn examples.
              pattern: "^Table(Head|Cell|Header|Footer)$",
              allow: ["layout", "typography", "color", "spacing"],
            },
            { pattern: "^(CardContent|PopoverContent|FieldGroup)$", allow: ["layout", "spacing"] },
            { pattern: "^(Input|InputGroupInput)$", allow: ["layout", "font-mono", "uppercase"] },
            // Checkbox and radio labels read as plain text, as in the shadcn examples.
            { pattern: "^FieldLabel$", allow: ["layout", "font-normal"] },
          ],
        },
      ],
      "react/react-in-jsx-scope": "off",
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "warn",
      "react/memo-dependencies": "error",
      "react/purity": "error",
      "react/refs": "error",
      "react/exhaustive-effect-dependencies": "error",
      "react/set-state-in-effect": "error",
      "react/immutability": "error",
      "react/no-array-index-key": "error",
      "react/no-unstable-nested-components": "error",
      "react/static-components": "error",
      "react/capitalized-calls": "error",
      "react/globals": "error",
      "react/set-state-in-render": "error",
      "react/unsupported-syntax": "error",
      "react/jsx-no-constructed-context-values": "error",
      "typescript/consistent-type-imports": "error",
      "typescript/no-explicit-any": "warn",
      "typescript/no-non-null-assertion": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      "typescript/no-deprecated": "error",
      "eslint/eqeqeq": ["error", "smart"],
      "import/no-cycle": "error",
      // Side-effect imports such as "@tanstack/react-start/server-only" are intentional.
      "import/no-unassigned-import": "off",
      "no-underscore-dangle": "off",
      "typescript/no-extraneous-class": "error",
      "eslint/no-empty-pattern": "error",
      "eslint/no-new": "error",
      "unicorn/no-useless-spread": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
      "react-doctor/effect-needs-cleanup": "error",
      "react-doctor/no-adjust-state-on-prop-change": "error",
      "react-doctor/no-async-effect-callback": "error",
      "react-doctor/no-call-component-as-function": "error",
      "react-doctor/no-cascading-set-state": "error",
      "react-doctor/no-create-context-in-render": "error",
      "react-doctor/no-derived-state-effect": "error",
      "react-doctor/no-direct-state-mutation": "error",
      "react-doctor/no-effect-event-handler": "error",
      "react-doctor/no-fetch-in-effect": "error",
      "react-doctor/no-mirror-prop-effect": "error",
      "react-doctor/no-mutating-reducer-state": "error",
      "react-doctor/no-nested-component-definition": "error",
      "react-doctor/no-random-key": "error",
      "react-doctor/no-reset-all-state-on-prop-change": "error",
      "react-doctor/no-self-updating-effect": "error",
      "react-doctor/no-set-state-in-render": "error",
      "react-doctor/no-secrets-in-client-code": "error",
      "react-doctor/no-react19-deprecated-apis": "error",
      "react-doctor/hooks-no-nan-in-deps": "error",
      "react-doctor/html-no-invalid-paragraph-child": "error",
      "react-doctor/html-no-invalid-table-nesting": "error",
      "react-doctor/html-no-nested-interactive": "error",
      "react-doctor/dialog-has-accessible-name": "error",
      "react-doctor/auth-token-in-web-storage": "error",
      "react-doctor/query-no-query-in-effect": "error",
      "react-doctor/query-no-rest-destructuring": "error",
      "react-doctor/query-no-usequery-for-mutation": "error",
      "react-doctor/query-no-void-query-fn": "error",
      "react-doctor/query-stable-query-client": "error",
      "react-doctor/tanstack-start-get-mutation": "error",
      "react-doctor/tanstack-start-no-anchor-element": "error",
      "react-doctor/tanstack-start-no-direct-fetch-in-loader": "error",
      "react-doctor/tanstack-start-no-dynamic-server-fn-import": "error",
      "react-doctor/tanstack-start-no-secrets-in-loader": "error",
      "react-doctor/tanstack-start-no-use-server-in-handler": "error",
      "react-doctor/tanstack-start-no-useeffect-fetch": "error",
      "react-doctor/tanstack-start-redirect-in-try-catch": "error",
      "react-doctor/tanstack-start-server-fn-validate-input": "error",
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
          "shadcn/require-static-classes": "off",
          "shadcn/no-arbitrary-values": "off",
          "shadcn/no-restyle": "off",
        },
      },
      {
        // Plain JavaScript copied into the server build: the type-aware rules only see any.
        files: ["*.mjs"],
        rules: {
          "typescript/no-unsafe-argument": "off",
          "typescript/no-unsafe-assignment": "off",
          "typescript/no-unsafe-call": "off",
          "typescript/no-unsafe-member-access": "off",
          "typescript/no-unsafe-return": "off",
        },
      },
      {
        // Composes the OTP primitives into the sign-in code field, in two looks of its own.
        files: ["src/features/auth/CodeInput.tsx"],
        rules: {
          "shadcn/no-restyle": "off",
        },
      },
    ],
    ignorePatterns: [
      "dist/**",
      ".output/**",
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
      ".output/**",
      "auth-migrations/**",
      "pnpm-lock.yaml",
    ],
  },
});
