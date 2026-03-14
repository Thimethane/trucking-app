# Deployment Guide

## Option 1: Render (Recommended — Free Tier)

Render.com provides free Python web services and static site hosting.

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "TruckLogger HOS — initial commit"
gh repo create trucking-app --public --push
```

### Step 2: Deploy Backend
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt && python manage.py migrate`
   - **Start Command:** `gunicorn trucklogger.wsgi --bind 0.0.0.0:$PORT`
4. Environment Variables:
   - `SECRET_KEY` = (generate a random 50-char string)
   - `DEBUG` = `False`
   - `ALLOWED_HOSTS` = `your-service-name.onrender.com`

### Step 3: Deploy Frontend
1. New → Static Site
2. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
3. Environment Variables:
   - `REACT_APP_API_URL` = `https://your-backend.onrender.com`

---

## Option 2: Vercel (Frontend) + Render (Backend)

Vercel gives faster CDN and preview deployments.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
REACT_APP_API_URL=https://your-backend.onrender.com npm run build
vercel --prod
```

The `vercel.json` in `frontend/` handles SPA routing (rewrites all paths to `index.html`).

---

## Option 3: Docker Compose (Self-hosted)

```yaml
# docker-compose.yml (add to project root)
version: '3.9'
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      SECRET_KEY: changeme
      DEBUG: "False"
    command: gunicorn trucklogger.wsgi --bind 0.0.0.0:8000

  frontend:
    build: ./frontend
    ports: ["3000:80"]
    environment:
      REACT_APP_API_URL: http://localhost:8000
    depends_on: [backend]
```

---

## Notes

- The SQLite database (`db.sqlite3`) is included but contains no sensitive data — it's just the empty Django migration state.
- The Nominatim geocoder is rate-limited to 1 req/sec. For production at scale, replace with the Google Maps Geocoding API or Mapbox.
- OSRM is a public demo server — for production, host your own OSRM instance or use the Mapbox Directions API.
