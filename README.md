# Project HRIS

Project HRIS is split into three runnable applications:

- `backend` - Express + Prisma + PostgreSQL API with JWT auth
- `web-dashboard` - Vite + React admin dashboard
- `mobile-app` - Expo + React Native employee time clock app

## Architecture

The backend is the source of truth for authentication, timeclock entries, timesheets, employee records, and reports.

- Backend API: `http://localhost:4000`
- Web dashboard dev server: `http://localhost:5173`
- Mobile app: Expo client hitting `http://10.0.2.2:4000/api` on Android emulator by default

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+ or Docker Desktop
- Expo Go or Android emulator for mobile testing

## Backend Setup

From `backend`:

```bash
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Default seeded accounts:

- Employee: `ari@company.com` / `Employee123!`
- Admin: `admin@company.com` / `Admin123!`

Health check:

```bash
curl http://localhost:4000/health
```

## Web Dashboard

From `web-dashboard`:

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Mobile App

From `mobile-app`:

```bash
npm install
npm start
```

Optional mobile env file:

```bash
copy .env.example .env
```

For Android emulator:

```bash
npm run android
```

The Expo app in [mobile-app/App.tsx](mobile-app/App.tsx) is wired to the backend login, status, clock-in, clock-out, timesheet, and profile endpoints. On Android emulator it uses `http://10.0.2.2:4000/api` by default.

To test on a physical device, set `EXPO_PUBLIC_API_BASE_URL` in `mobile-app/.env` to your machine's LAN URL, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:4000/api
```

## Docker Compose

From the repo root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on port `5432`
- Backend API on port `4000`

After the database is up, run the Prisma migration and seed once inside `backend` if this is a fresh environment.

## Notes

- Photo uploads are saved under `backend/uploads/selfies`
- The mobile API base URL can be overridden with `EXPO_PUBLIC_API_BASE_URL` in `mobile-app/.env`
- The current mobile implementation is Expo/React Native. The partial Flutter scaffold in `mobile-app/lib` is not part of the active runtime