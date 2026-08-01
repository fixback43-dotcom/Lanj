const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const pool = require("../db");
const { signToken, requireAuth } = require("../auth");

const router = express.Router();

// Batasi percobaan login/register biar gak gampang di-brute-force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." },
});

function normalizeUsername(u) {
  return (u || "").trim().toLowerCase();
}

function validateRegisterInput({ name, username, password, password2 }) {
  const cleanName = (name || "").trim();
  const uname = normalizeUsername(username);
  if (!cleanName) return "Nama lengkap wajib diisi.";
  if (!uname || uname.length < 3) return "Username minimal 3 karakter.";
  if (!/^[a-z0-9_.]+$/.test(uname)) return "Username hanya boleh huruf, angka, titik, dan underscore.";
  if (!password || password.length < 4) return "Kata sandi minimal 4 karakter.";
  if (password !== password2) return "Konfirmasi kata sandi tidak cocok.";
  return null;
}

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res) => {
  const { name, username, password, password2 } = req.body || {};
  const validationError = validateRegisterInput({ name, username, password, password2 });
  if (validationError) return res.status(400).json({ error: validationError });

  const uname = normalizeUsername(username);
  const cleanName = name.trim();

  try {
    const existing = await pool.query("SELECT id FROM users WHERE username = $1", [uname]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Username sudah terdaftar. Coba login." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, name, password_hash) VALUES ($1, $2, $3)
       RETURNING id, username, name`,
      [uname, cleanName, passwordHash]
    );
    const user = result.rows[0];
    const token = signToken(user);
    return res.status(201).json({ token, user: { username: user.username, name: user.name } });
  } catch (err) {
    console.error("[register] error:", err.message);
    return res.status(500).json({ error: "Gagal mendaftar. Coba lagi nanti." });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  const uname = normalizeUsername(username);
  if (!uname || !password) {
    return res.status(400).json({ error: "Username dan kata sandi wajib diisi." });
  }

  try {
    const result = await pool.query(
      "SELECT id, username, name, password_hash FROM users WHERE username = $1",
      [uname]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "Akun tidak ditemukan.", code: "USER_NOT_FOUND" });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Kata sandi salah." });
    }
    const token = signToken(user);
    return res.json({ token, user: { username: user.username, name: user.name } });
  } catch (err) {
    console.error("[login] error:", err.message);
    return res.status(500).json({ error: "Gagal login. Coba lagi nanti." });
  }
});

// GET /api/auth/me — validasi token & ambil profil terkini
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT username, name FROM users WHERE id = $1", [req.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Akun tidak ditemukan." });
    return res.json({ user });
  } catch (err) {
    console.error("[me] error:", err.message);
    return res.status(500).json({ error: "Gagal memuat profil." });
  }
});

module.exports = router;
