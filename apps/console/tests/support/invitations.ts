import { config } from "dotenv";
import { Pool } from "pg";

config({ quiet: true });

/**
 * Moves an invitation's validity back, as if it had been sent that many seconds earlier, so a test can get
 * past the one-minute wait between emails without waiting. Returns the new expiry.
 */
export async function ageInvitation(invitationId: string, seconds: number): Promise<Date> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query<{ expires_at: Date }>(
      `UPDATE auth.invitation SET expires_at = expires_at - make_interval(secs => $2)
       WHERE id = $1 RETURNING expires_at`,
      [invitationId, seconds],
    );
    const [row] = rows;
    if (!row) {
      throw new Error(`No invitation ${invitationId}`);
    }
    return row.expires_at;
  } finally {
    await pool.end();
  }
}

export async function invitationExpiry(invitationId: string): Promise<Date> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query<{ expires_at: Date }>(
      "SELECT expires_at FROM auth.invitation WHERE id = $1",
      [invitationId],
    );
    const [row] = rows;
    if (!row) {
      throw new Error(`No invitation ${invitationId}`);
    }
    return row.expires_at;
  } finally {
    await pool.end();
  }
}
