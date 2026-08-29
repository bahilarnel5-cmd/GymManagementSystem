# Gym Management System

Full-stack gym management application with FastAPI backend and React frontend.

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy 2.0, Alembic
- **Frontend**: React 19, Vite, Tailwind CSS, Zustand, TanStack Query
- **Database**: PostgreSQL (Supabase)
- **Deploy**: Vercel (frontend), any Python host (backend)

## Setup

### Backend

```bash
pip install -r requirements.txt
cp .env.example .env  # Fill in your Supabase DATABASE_URL and SECRET_KEY
alembic upgrade head
python -m uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` to `http://localhost:8000`.

### Seed Data

```bash
python -m app.seed_data
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret |
| `CORS_ORIGINS` | Comma-separated allowed origins |

## Default Login

After seeding, create an admin user or use the register endpoint:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gym.com","password":"admin123","member_id":"<uuid>"}'
```

## Deployment

### Backend (Render)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and configure:
   - **Build**: `pip install -r requirements.txt`
   - **Start**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **CORS_ORIGINS**: defaults to your Vercel domain + localhost
5. Set environment variables in Render dashboard (or let `render.yaml` fill them):
   - `DATABASE_URL` — your Supabase connection string
   - `CORS_ORIGINS` — `https://gymmanagementsystemnew.vercel.app,http://localhost:5173`
   - `SECRET_KEY` — any random string
6. Run `alembic upgrade head` in Render's shell tab to create tables
7. Your backend URL is `https://gymmanagementsystem-rkav.onrender.com`

> **Note:** The free tier sleeps after ~15 min of inactivity and cold-starts
> slowly, which can time out the Vercel proxy. `render.yaml` includes a free
> cron job (`gym-keepalive`, every 10 min) that pings `/health/db` to keep the
> service warm. Deploy via Blueprint so the cron job is created.

### Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Vercel auto-detects `vercel.json` config
4. `vercel.json` rewrites `/api/*` to the Render backend:
   - `https://gymmanagementsystemnew.vercel.app`
   - backend: `https://gymmanagementsystem-rkav.onrender.com`
5. **Recommended**: add the env var `VITE_API_URL` = `https://gymmanagementsystem-rkav.onrender.com`
   so the browser calls the backend directly (avoids the Vercel proxy timeout).
6. Deploy — your frontend is at `https://gymmanagementsystemnew.vercel.app`

### Create Login Accounts

After both are deployed, run this SQL in **Supabase SQL Editor**:

```sql
INSERT INTO organizations (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Gym')
ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id, organization_id, member_code, full_name, email, mobile_phone, status, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'AG-10000', 'Demo Member', 'member@gym.com', '+63 912 345 6789', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO gym_users (id, organization_id, email, hashed_password, role, member_id, created_at, updated_at)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin@gym.com', '$2b$12$LJ3m4ris8HKEHKNYKMC2p.pSZxq2cQpZGSiMvGlIHP9MiIYlVJICO', 'admin', NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO gym_users (id, organization_id, email, hashed_password, role, member_id, created_at, updated_at)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'member@gym.com', '$2b$12$LJ3m4ris8HKEHKNYKMC2p.pSZxq2cQpZGSiMvGlIHP9MiIYlVJICO', 'member', '22222222-2222-2222-2222-222222222222', NOW(), NOW())
ON CONFLICT DO NOTHING;
```

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@gym.com` | `admin123` |
| Member | `member@gym.com` | `member123` |
