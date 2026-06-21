import { Pool, PoolClient } from "pg";
import config from "../config";

export const pool = new Pool(config.db);

pool.on("error", (err: Error) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

pool.on("connect", () => {
  console.log("[DB] New client connected");
});

/**
 * Run a callback inside a transaction. Auto-commits on success, rolls back on error.
 * The callback receives a PoolClient that should be used for all queries in the transaction.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
