const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("[FATAL] DATABASE_URL belum diset di .env. Server berhenti.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon butuh SSL. Kalau nanti pindah ke Postgres lokal tanpa SSL,
  // set PGSSL=false di .env.
  ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected error pada idle client:", err.message);
});

module.exports = pool;
