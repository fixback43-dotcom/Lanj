require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const dataRoutes = require("./routes/data");

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (mis. curl/health check) dan origin yang terdaftar.
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin tidak diizinkan oleh CORS: " + origin));
    },
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/health", (req, res) => res.json({ ok: true, service: "nexa-study-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);

app.use((err, req, res, next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ error: "Terjadi kesalahan server." });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[nexa-study-backend] jalan di port ${PORT}`);
  if (allowedOrigins.length === 0) {
    console.warn("[WARN] ALLOWED_ORIGINS kosong — CORS mengizinkan SEMUA origin. Set ini di production!");
  }
});
