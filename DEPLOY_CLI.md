# Deploy Full Vercel (Backend + Frontend)

Dua Vercel project terpisah:
- **Backend**: folder `backend` → Vercel Serverless (Express)
- **Frontend**: folder `web-dashboard` → Vercel Static (Vite)

---

## 1) Prasyarat

- Akun Vercel (gratis)
- Repo sudah di-push ke GitHub

---

## 2) Deploy Backend ke Vercel

File yang sudah disiapkan:
- `backend/api/index.js` — entry point serverless
- `backend/vercel.json` — routing config

### Langkah di Vercel Dashboard:
1. Buka dashboard.vercel.com → **Add New Project**
2. Import repo yang sama, atur **Root Directory** ke `backend`
3. Framework Preset: **Other**
4. Build Command: `npm install && npx prisma generate`
5. Output Directory: (kosongkan)
6. Tambahkan Environment Variables:
   - `DATABASE_URL` = nilai dari backend/.env
   - `TURSO_AUTH_TOKEN` = nilai dari backend/.env
   - `JWT_SECRET` = nilai dari backend/.env
   - `JWT_EXPIRES_IN` = `7d`
   - `NODE_ENV` = `production`
   - `PHOTO_UPLOAD_DIR` = `/tmp/selfies`
7. Deploy

Setelah deploy, cek health:
- `https://<nama-backend>.vercel.app/health`

### Inisialisasi DB + seed (sekali saja):
Jalankan dari lokal dengan env production:
- Ganti DATABASE_URL di `.env` ke Turso URL production (sudah diset)
- `cd backend && npm run turso:init && npm run seed`

---

## 3) Deploy Frontend ke Vercel

File yang sudah disiapkan:
- `web-dashboard/vercel.json` — config Vite

### Langkah di Vercel Dashboard:
1. **Add New Project** lagi (project baru, bukan yang sama)
2. Import repo yang sama, atur **Root Directory** ke `web-dashboard`
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Tambahkan Environment Variables:
   - `VITE_API_URL` = `https://<nama-backend>.vercel.app/api`
7. Deploy

---

## 4) Verifikasi

1. `https://<nama-backend>.vercel.app/health` → `{"status":"ok"}`
2. Buka URL frontend Vercel → login dengan `admin@company.com` / `Admin123!`
3. Pastikan data employees/outlets muncul

---

## 5) Catatan penting

- **Upload foto**: Vercel tidak punya persistent disk. Foto selfie disimpan ke `/tmp/selfies` dan akan hilang setelah function cold start. Untuk produksi jangka panjang, migrasikan ke Cloudinary/S3/R2.
- **CORS**: backend sudah pakai `origin: true`, aman untuk domain Vercel apapun.
- **Jangan commit** token/secret ke repo. Simpan hanya di Environment Variables Vercel dashboard.
- **Auto-deploy**: setiap `git push` ke main akan otomatis trigger re-deploy di kedua project Vercel.
