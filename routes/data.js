const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/data — ambil semua key-value milik user yang login
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT key, value FROM user_data WHERE user_id = $1", [req.userId]);
    const data = {};
    for (const row of result.rows) data[row.key] = row.value;
    return res.json({ data });
  } catch (err) {
    console.error("[data:get] error:", err.message);
    return res.status(500).json({ error: "Gagal mengambil data." });
  }
});

// PUT /api/data — simpan/update satu key (dipanggil tiap kali Store.set() dipanggil di frontend)
router.put("/", async (req, res) => {
  const { key, value } = req.body || {};
  if (!key || typeof key !== "string") {
    return res.status(400).json({ error: "key wajib diisi." });
  }
  try {
    await pool.query(
      `INSERT INTO user_data (user_id, key, value, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id, key) DO UPDATE SET value = $3, updated_at = now()`,
      [req.userId, key, JSON.stringify(value ?? null)]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("[data:put] error:", err.message);
    return res.status(500).json({ error: "Gagal menyimpan data." });
  }
});

// POST /api/data/bulk — simpan banyak key sekaligus.
// Dipakai SEKALI SAJA saat migrasi akun lama (localStorage) ke server.
router.post("/bulk", async (req, res) => {
  const { data } = req.body || {};
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "data wajib berupa object." });
  }
  const entries = Object.entries(data);
  if (entries.length === 0) return res.json({ ok: true, count: 0 });
  if (entries.length > 100) {
    return res.status(400).json({ error: "Terlalu banyak key dalam satu request." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of entries) {
      await client.query(
        `INSERT INTO user_data (user_id, key, value, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id, key) DO UPDATE SET value = $3, updated_at = now()`,
        [req.userId, key, JSON.stringify(value ?? null)]
      );
    }
    await client.query("COMMIT");
    return res.json({ ok: true, count: entries.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[data:bulk] error:", err.message);
    return res.status(500).json({ error: "Gagal migrasi data." });
  } finally {
    client.release();
  }
});

module.exports = router;
