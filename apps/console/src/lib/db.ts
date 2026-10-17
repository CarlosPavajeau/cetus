import "@tanstack/react-start/server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env";
import * as schema from "./auth/schema";

// prepare: false keeps it compatible with PgBouncer in transaction mode (PlanetScale pooler).
const client = postgres(env.DATABASE_URL, { prepare: false, max: 5 });

export const db = drizzle(client, { schema });
