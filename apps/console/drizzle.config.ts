import dotenv from "dotenv"
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: ".env",
})

// Drizzle only owns the "auth" schema. The "billing" schema belongs to Flyway (Java).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/auth/schema.ts",
  out: "./auth-migrations",
  schemaFilter: ["auth"],
  migrations: { schema: "auth", table: "__drizzle_migrations" },
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
