# nexa-study-backend

Backend login + sinkronisasi data buat **Study Planner Premium**. Express + PostgreSQL (Neon).
Dirancang buat jadi partner dari frontend statis `study-planner` — bukan gabung jadi satu app.

## Cara Kerja (ringkes)

- User daftar/login → server bikin akun di Postgres (password di-hash pakai bcrypt, bukan disimpan mentah).
- Server balikin **JWT token**, disimpan di localStorage/sessionStorage browser, dipakai buat tiap request selanjutnya.
- Data belajar (jadwal, nilai, catatan, dst.) disimpan sebagai key-value per akun di tabel `user_data`, formatnya JSONB — sama persis strukturnya kayak yang dulu di LocalStorage, jadi gak perlu transformasi data.
- Frontend tetap baca-tulis ke LocalStorage secara **sinkron** (biar app tetap responsif & bisa dipakai offline sesuai desain PWA aslinya). Tiap perubahan otomatis diantre (`SyncQueue`) dan dikirim ke server di background — kalau lagi offline, antrean nunggu sampai koneksi balik.
- Login pertama kali di device baru → server jadi sumber kebenaran, data ditarik dari server nimpa cache lokal.
- **Migrasi otomatis**: akun yang dibuat SEBELUM backend ini ada (murni LocalStorage) otomatis didaftarkan ke server pas pertama kali login setelah update ini, terus semua data lokalnya didorong ke server sekali. User gak perlu ngapa-ngapain manual.

## Setup

```bash
npm install
cp .env.example .env
```

Isi `.env`:
1. `DATABASE_URL` — connection string dari Neon (Dashboard → Connection Details → pilih "Pooled connection" kalau ada).
2. `JWT_SECRET` — generate acak:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. `ALLOWED_ORIGINS` — domain tempat `study-planner` di-deploy (misal `https://study-planner-mu.vercel.app`). **Wajib diisi di production**, kalau kosong CORS kebuka buat semua origin (cuma boleh dipakai pas testing lokal).

Jalankan skema database (sekali saja):

```bash
psql "$DATABASE_URL" -f schema.sql
```

Nyalakan server:

```bash
npm start          # production
npm run dev         # auto-restart pas edit file
```

Cek hidup: `curl http://localhost:3001/health`

## Deploy ke Pterodactyl

Sama kayak deploy bot NEXA-mu:
1. Upload semua file (kecuali `node_modules` & `.env`) lewat File Manager.
2. Startup command: `node server.js` (atau `npm start`).
3. Set environment variables di panel Pterodactyl (DATABASE_URL, JWT_SECRET, ALLOWED_ORIGINS, PORT) — jangan upload file `.env` langsung ke server produksi kalau panelnya publik.
4. Jalankan `npm install` sekali lewat console Pterodactyl sebelum start pertama.
5. Restart manual tiap ganti kode (sama kayak bot Telegram-mu, gak pakai PM2/cluster).

## Trade-off yang perlu kamu tau (jujur, gak digelapin)

- **Login pertama akun baru wajib online.** Gak isok daftar akun baru pas offline total — itu konsekuensi logis kalau akun mau tersimpan di server, dudu di device.
- **Konflik multi-device**: kalau kamu edit data di HP offline lama, terus buka di laptop (online, ke-pull data server yang lebih lama gak sinkron), data HP yang belum sempat ke-sync bisa ketimpa pas laptop push duluan. Ini **last-write-wins per key**, bukan merge pintar. Buat use-case app belajar personal, risiko ini kecil (jarang edit bersamaan dari 2 device), tapi tetap kudu kamu tau batasnya.
- **Rate limit login/register**: 20 percobaan per 15 menit per IP, biar gak gampang di-brute-force. Kalau testing rame-rame dari 1 jaringan (misal sekolah), bisa kena limit bareng — naikkan `max` di `routes/auth.js` kalau perlu.
