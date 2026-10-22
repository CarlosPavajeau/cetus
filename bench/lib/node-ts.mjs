// Lets plain Node (with its built-in type stripping) run bench/seed.ts, which reuses the console's test
// helpers: those import siblings without an extension ("./stack"), as Vite resolves them.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error?.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
