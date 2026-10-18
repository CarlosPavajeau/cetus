import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "jsx-a11y", "import", "promise"],
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
});
