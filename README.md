# TruckLogger HOS — FMCSA Compliance Engine

> Full-stack logistics application that automates trip routing and Hours of Service (HOS) compliance for commercial truck drivers.

**Live Demo:** `https://trucklogger-frontend.onrender.com`  
**Backend API:** `https://trucklogger-api.onrender.com`

---

## Features

| Feature | Detail |
|---------|--------|
| 🗺️ **Route Map** | Real-road routing via OSRM + CartoDB Dark tiles (free, no API key) |
| 📋 **HOS Engine** | All 5 FMCSA property-carrying rules enforced (see below) |
| 📄 **Log Sheets** | Pixel-perfect ELD-style daily logs generated as PNG (downloadable, printable) |
| 📊 **Log Grid** | Interactive 24-hr timeline grid per day, hover for entry details |
| ⛽ **Fuel Stops** | Auto-scheduled every ≤1,000 miles |
| 🛌 **Rest Breaks** | 30-min breaks, 10-hr rests, 34-hr restarts inserted automatically |
| 🏗️ **Multi-day** | Trips spanning many days produce one log sheet per calendar day |

---

## FMCSA Rules Enforced

| Rule | Regulation | Implementation |
|------|-----------|----------------|
| **11-Hour Driving Limit** | §395.3(a)(3) | `driving_today >= 11.0` triggers 10-hr off-duty |
| **14-Hour Driving Window** | §395.3(a)(2) | `on_duty_window >= 14.0` ends shift regardless of remaining drive time |
| **30-Minute Break** | §395.3(a)(3)(ii) | `drive_since_break >= 8.0` inserts mandatory 30-min break |
| **70-Hour / 8-Day Rule** | §395.3(b) | Rolling 8-element array; oldest day drops at midnight |
| **34-Hour Restart** | §395.3(c) | `consec_off >= 34.0` resets all 8-day cycle hours to zero |

Additional assumptions:
- Average speed: 55 mph
- 1 hour on-duty (not driving) for pickup and drop-off each
- Fuel stop of 30 min every ≤1,000 miles
- Pre-trip inspection: 30 min on-duty (not driving)
- No adverse driving conditions (70/8 day, not 60/7 day)

---

## Tech Stack

### Backend
- **Python 3.11** + **Django 4.2**
- **Django REST Framework** — REST API
- **Pillow** — programmatic PNG log sheet generation
- **Requests** — Nominatim (OSM) geocoding
- **Gunicorn** + **Whitenoise** — production WSGI server

### Frontend
- **React 18** + **Material UI 5** (dark theme, IBM Plex Mono)
- **Leaflet 1.9** + **react-leaflet** — interactive map
- **OSRM** — free road-routing API (no key required)
- **CartoDB Dark tiles** — free map tiles (OpenStreetMap data)
- **Axios** — API client

### Maps & Geocoding (100% free, no API keys)
| Service | Use | URL |
|---------|-----|-----|
| **Nominatim (OSM)** | Geocoding city → lat/lon | nominatim.openstreetmap.org |
| **CartoDB Dark All** | Map tiles | basemaps.cartocdn.com |
| **OSRM** | Real road routing | router.project-osrm.org |

---

## Project Structure

```
trucking-app/
├── backend/
│   ├── trips/
│   │   ├── compliance_engine.py   # HOS rules engine (core algorithm)
│   │   ├── log_generator.py       # Pillow-based ELD log sheet renderer
│   │   ├── views.py               # DRF API views + Nominatim geocoding
│   │   └── urls.py
│   ├── trucklogger/
│   │   ├── settings.py            # Django settings (CORS, whitenoise, etc.)
│   │   └── urls.py
│   ├── requirements.txt
│   └── Procfile                   # Render/Heroku deployment
│
├── frontend/
│   ├── src/
│   │   ├── App.js                 # MUI theme (dark, IBM Plex Mono)
│   │   ├── pages/
│   │   │   └── TripPlannerPage.js # Main layout
│   │   └── components/
│   │       ├── TripForm.js        # Input form with cycle slider
│   │       ├── TripSummary.js     # Stat cards + stop timeline
│   │       ├── RouteMap.js        # Leaflet map (OSRM routing)
│   │       ├── HOSLogGrid.js      # 24-hr interactive log grid
│   │       └── LogSheetViewer.js  # PNG log sheets + zoom/download
│   ├── vercel.json
│   └── package.json
│
├── render.yaml                    # One-click Render deployment
└── README.md
```

---

## Quick Start

### 1. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
# API available at http://localhost:8000
```

### 2. Frontend
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000 npm start
# App available at http://localhost:3000
```

---

## API Reference

### `POST /api/trips/plan/`

Calculate a complete HOS-compliant trip plan.

**Request:**
```json
{
  "origin":             "Chicago, IL",
  "pickup":             "Indianapolis, IN",
  "dropoff":            "Nashville, TN",
  "current_cycle_used": 20
}
```

**Response:**
```json
{
  "summary": {
    "total_miles": 415.4,
    "total_days": 2,
    "distance_to_pickup": 165.0,
    "distance_pickup_to_dropoff": 250.4,
    "estimated_drive_hours": 7.6,
    "fuel_stops": 0,
    "rest_stops": 1
  },
  "stops": [
    {
      "name": "Indianapolis, IN",
      "stop_type": "pickup",
      "lat": 39.768,
      "lon": -86.158,
      "duration_hours": 1.0,
      "day": 1,
      "cumulative_miles": 165.0
    }
  ],
  "daily_logs": [
    {
      "day_number": 1,
      "date_label": "Day 1",
      "total_driving": 11.0,
      "total_on_duty": 0.5,
      "total_off_duty": 12.5,
      "odometer_start": 0,
      "odometer_end": 605,
      "entries": [...]
    }
  ],
  "log_images": ["<base64 PNG>", ...],
  "waypoints": [{"lat": ..., "lon": ..., "type": "origin"}, ...],
  "locations": {
    "origin":  {"name": "...", "lat": ..., "lon": ...},
    "pickup":  {"name": "...", "lat": ..., "lon": ...},
    "dropoff": {"name": "...", "lat": ..., "lon": ...}
  }
}
```

### `GET /api/trips/geocode/?q=Chicago,+IL`

Geocode a location string (proxied Nominatim).

---

## Deployment

### Option A: Render (backend + frontend, free tier)

```bash
# Push to GitHub
git init && git add . && git commit -m "init"
git remote add origin https://github.com/Thimethane/trucking-app.git
git push

# render.yaml is pre-configured — connect repo at render.com
# Creates two services: trucklogger-api (Python) + trucklogger-frontend (Static)
```

### Option B: Vercel (frontend) + Render (backend)

```bash
# Backend: Render Web Service
# Build: cd backend && pip install -r requirements.txt && python manage.py migrate
# Start:  cd backend && gunicorn trucklogger.wsgi --bind 0.0.0.0:$PORT
# Env:    SECRET_KEY=<generate>, DEBUG=False

# Frontend: Vercel
cd frontend
npx vercel --prod
# Env: REACT_APP_API_URL=https://trucklogger-api.onrender.com
```

### Environment Variables

**Backend:**
```env
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=https://trucklogger-api.onrender.com,localhost
```

**Frontend:**
```env
REACT_APP_API_URL=https://trucklogger-api.onrender.com
```

---

## Algorithm Design

The compliance engine (`compliance_engine.py`) uses a **greedy simulation** approach:

1. **Drive segments** are split into chunks limited by whichever HOS constraint is most binding
2. **Mandatory breaks** are inserted inline when the relevant threshold is crossed
3. **Day rollover** at midnight properly shifts the 8-day cycle array and resets calendar-day counters
4. **Fuel stops** are injected when `miles_since_fuel` approaches 1,000 miles
5. **Log entries** cross midnight cleanly — a single driving block that spans midnight is split into two entries, each on the correct calendar day

The engine returns a full serializable result including base64 PNG log sheets ready to display or print.

---

## License

MIT
