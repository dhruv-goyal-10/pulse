# Deploying Pulse

Two supported paths. The Oracle VM path is what I recommend for a portfolio piece because there are no cold starts or free-tier expirations, and it demonstrates real deployment skill. The Render + Neon path is the "zero-DevOps" fallback if you'd rather not manage a server.

---

## Option A — Oracle Cloud Always-Free VM (recommended)

Runs everything on one VM: FastAPI, Postgres, Caddy (auto-HTTPS). No domain purchase, no expiring free tier.

### What you need

- An **Oracle Cloud Always Free** VM (ARM Ampere A1 recommended: 4 vCPU / 24 GB RAM — genuinely free forever).
  - Ubuntu 22.04 or newer.
  - Ports 22, 80, 443 open in the OCI security list AND `sudo ufw allow` if firewall is on.
- Your VM's public IPv4 (e.g., `129.146.10.42`).

### 1. Install Docker on the VM

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone the repo

```bash
git clone <your-repo-url> pulse
cd pulse
```

### 3. Create production env files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.production
```

Edit `backend/.env`:

```env
JWT_SECRET_KEY=<paste output of: python3 -c "import secrets; print(secrets.token_hex(32))">
DATABASE_URL=postgresql+asyncpg://pulse:pulse@postgres:5432/pulse
DATABASE_URL_SYNC=postgresql+psycopg2://pulse:pulse@postgres:5432/pulse
FRONTEND_URL=https://pulse-<VM-IP-with-dashes>.sslip.io
CORS_ORIGINS=https://pulse-<VM-IP-with-dashes>.sslip.io
GOOGLE_REDIRECT_URI=https://pulse-api-<VM-IP-with-dashes>.sslip.io/api/auth/google/callback
DEMO_PASSWORD=<something-not-demo123>
```

`<VM-IP-with-dashes>` = your VM's IP with dots replaced by dashes (e.g., `129-146-10-42`).

Edit `frontend/.env.production`:

```env
NEXT_PUBLIC_API_BASE=https://pulse-api-<VM-IP-with-dashes>.sslip.io
```

### 4. Add a production `docker-compose.prod.yml`

Create `docker-compose.prod.yml` at repo root:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: pulse
      POSTGRES_PASSWORD: pulse
      POSTGRES_DB: pulse
    volumes:
      - pulse-pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pulse"]
      interval: 5s
      retries: 10

  backend:
    build:
      context: ./backend
    restart: unless-stopped
    env_file: backend/.env
    depends_on:
      postgres:
        condition: service_healthy
    command: >
      sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_BASE: ${NEXT_PUBLIC_API_BASE}
    restart: unless-stopped
    env_file: frontend/.env.production

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      - backend
      - frontend

volumes:
  pulse-pg-data:
  caddy-data:
  caddy-config:
```

### 5. Create `Caddyfile` at repo root

Replace `<IP-DASHES>` with your VM IP with dots as dashes:

```
pulse-<IP-DASHES>.sslip.io {
    reverse_proxy frontend:3000
}

pulse-api-<IP-DASHES>.sslip.io {
    reverse_proxy backend:8000
}
```

Caddy will auto-obtain Let's Encrypt certs on first request. `sslip.io` resolves `<IP-DASHES>.sslip.io` → your IP, so no DNS setup is required.

### 6. Create Dockerfiles

`backend/Dockerfile`:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

### 7. Boot it

```bash
docker compose -f docker-compose.prod.yml up -d --build
# once services are healthy:
docker compose -f docker-compose.prod.yml exec backend python -m scripts.seed
```

### 8. Visit

- Dashboard: `https://pulse-<IP-DASHES>.sslip.io`
- API docs: `https://pulse-api-<IP-DASHES>.sslip.io/docs`

### Updates

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Option B — Render + Neon (fallback)

Simpler if you don't want a VM. Downsides: Render's free web service cold-starts after 15 min idle (~30s), and Neon autoscales to zero (~1s wake).

### 1. Postgres — Neon

- Sign up at <https://neon.tech>, create a project.
- Copy the connection string (starts with `postgres://…`).
- Rewrite to asyncpg-compatible for `DATABASE_URL`:
  `postgresql+asyncpg://user:pw@host/db?sslmode=require`
- And a sync variant for `DATABASE_URL_SYNC`:
  `postgresql+psycopg2://user:pw@host/db?sslmode=require`

### 2. Backend — Render Web Service

- New → Web Service → connect your repo.
- Root directory: `backend`
- Build command: `pip install -r requirements.txt && alembic upgrade head`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment: copy every var from `backend/.env.example`, filling in real values.
- Deploy. Note the URL (e.g., `pulse-api.onrender.com`).

To seed after the first deploy, use Render's Shell tab:

```bash
python -m scripts.seed
```

### 3. Frontend — Vercel

- Import the repo in Vercel; Root Directory: `frontend`.
- Environment variable: `NEXT_PUBLIC_API_BASE=https://pulse-api.onrender.com`
- Deploy. Note the URL (e.g., `pulse.vercel.app`).

### 4. Wire the URLs

Back on Render, update the backend service env vars:

```
FRONTEND_URL=https://pulse.vercel.app
CORS_ORIGINS=https://pulse.vercel.app
GOOGLE_REDIRECT_URI=https://pulse-api.onrender.com/api/auth/google/callback
```

### 5. Warm-start hint

Because Render free spins down, the first request after idle takes ~30s. Options:

- Add an `Uptime Robot` monitor pinging `/api/health` every 10 minutes (keeps it warm).
- Or accept the cold start and show a friendly "warming up…" state on the login page.

---

## Optional — Google OAuth setup

Both paths support this if you fill in `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.

1. Go to <https://console.cloud.google.com> → APIs & Services → Credentials.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Authorized redirect URIs: paste your `GOOGLE_REDIRECT_URI` value from `.env`.
4. Copy the client ID + secret into your backend `.env` and restart.

The "Sign in with Google" button on the login page will now work.
