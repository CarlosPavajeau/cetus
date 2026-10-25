import { config } from "dotenv";
import { Pool } from "pg";

config({ quiet: true });

/** The documents and versions the user accepted. */
export async function consentsOf(email: string): Promise<{ document: string; version: string }[]> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query<{ document: string; version: string }>(
      `SELECT c.document, c.version FROM auth.consent c JOIN auth."user" u ON u.id = c.user_id
       WHERE u.email = $1 ORDER BY c.document`,
      [email],
    );
    return rows;
  } finally {
    await pool.end();
  }
}

/** Drops the user's acceptances, as if the documents had a version they have not accepted yet. */
export async function forgetConsents(email: string) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(
      `DELETE FROM auth.consent WHERE user_id = (SELECT id FROM auth."user" WHERE email = $1)`,
      [email],
    );
  } finally {
    await pool.end();
  }
}
