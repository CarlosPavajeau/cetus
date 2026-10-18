import "@tanstack/react-start/server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { relations } from "./auth/schema";
import { env } from "./env";

// node-postgres only uses unnamed statements, which keeps it compatible with PgBouncer in transaction mode (PlanetScale pooler).
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 5 });

export const db = drizzle({ client: pool, relations });
