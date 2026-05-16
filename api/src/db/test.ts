import { Pool } from "pg";
import "dotenv/config";

async function testSSL() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const res = await pool.query(`
    SELECT ssl, version, inet_server_addr()
    FROM pg_stat_ssl
    WHERE pid = pg_backend_pid()
  `);

  console.log(res.rows);

  await pool.end();
}

testSSL();
