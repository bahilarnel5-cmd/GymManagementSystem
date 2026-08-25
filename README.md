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
