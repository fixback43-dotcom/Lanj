-- Study Planner Premium (NEXA) — Skema Database
-- Jalankan sekali di Postgres (Neon) sebelum server pertama kali dinyalakan.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Menyimpan seluruh data belajar per akun sebagai key-value JSON.
-- Key-nya sama persis dengan key yang dulu dipakai di localStorage
-- (schedule, checklistDaily, targets, scores, notes, flashcards, dst.)
-- sehingga migrasi dari data lama tidak butuh transformasi skema.
CREATE TABLE IF NOT EXISTS user_data (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
