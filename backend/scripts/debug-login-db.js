import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // List tables
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("TABLES:", tables.rows.map(r => r.name));

  const t1 = Date.now();
  const countResult = await client.execute('select count(*) as c from users');
  console.log("COUNT_MS", Date.now() - t1, countResult.rows[0]);

  const t2 = Date.now();
  const rowsResult = await client.execute('select id, email, role, is_active from users limit 5');
  console.log("ROWS_MS", Date.now() - t2, rowsResult.rows.length);
  console.log(rowsResult.rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
