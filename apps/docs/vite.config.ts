import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { defineConfig, lazyPlugins } from "vite-plus";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: { host: "127.0.0.1", port: 3001 },
  plugins: lazyPlugins(() => [
    fumadocsMdx(),
    tsconfigPaths(),
    tailwindcss(),
    // A static site: every page is rendered at build time, and a broken internal link fails the build.
    tanstackStart({
      prerender: { enabled: true, crawlLinks: true, failOnError: true },
      pages: [{ path: "/api/search" }],
    }),
    viteReact(),
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
      "import/no-unassigned-import": "off",
      "no-underscore-dangle": "off",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    ignorePatterns: ["dist/**", ".tanstack/**", "src/routeTree.gen.ts"],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    printWidth: 100,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    sortImports: true,
    sortTailwindcss: {
      stylesheet: "./src/styles/app.css",
      functions: ["cn"],
    },
    sortPackageJson: true,
    ignorePatterns: ["src/routeTree.gen.ts", "public/openapi.public.json"],
  },
});
