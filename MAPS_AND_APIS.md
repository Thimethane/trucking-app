# Maps & External APIs — TruckLogger HOS

This project uses **100% free APIs with no registration or API keys required.**

---

## 1. Map Tiles — CartoDB Dark Matter

**Provider:** CARTO (basemaps.cartocdn.com)  
**License:** Free for non-commercial use; attribution required  
**Implementation:** `RouteMap.js`

```javascript
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors © CARTO',
  subdomains: 'abcd', maxZoom: 19,
})
```

The dark "Dark Matter" tile style perfectly matches the application's dark theme.

---

## 2. Road Routing — OSRM (Open Source Routing Machine)

**Provider:** Project OSRM (router.project-osrm.org)  
**License:** Free public demo server; ODbL for data  
**Implementation:** `RouteMap.js` — fetched on map init, falls back to straight-line polyline

```javascript
const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
```

OSRM returns a GeoJSON linestring of the actual road path, which we draw as a polyline on the map. If OSRM is unavailable (timeout/rate-limit), the app gracefully degrades to a straight-line route between the three key points.

---

## 3. Geocoding — Nominatim (OpenStreetMap)

**Provider:** Nominatim (nominatim.openstreetmap.org)  
**License:** Free; ODbL; 1 req/sec usage policy  
**Implementation:** `views.py` (Django backend proxy)

```python
resp = requests.get(
    "https://nominatim.openstreetmap.org/search",
    params={"q": location, "format": "json", "limit": 1, "countrycodes": "us"},
    headers={"User-Agent": "TruckLoggerHOS/1.0"},
)
```

Geocoding runs on the **backend** to:
- Avoid CORS issues
- Respect Nominatim's User-Agent requirement
- Allow caching / rate-limiting in the future

Inputs like `"Chicago, IL"` are resolved to `{lat: 41.878, lon: -87.629}`.

---

## Summary Table

| Service     | Purpose            | API Key | Cost | Rate Limit |
|-------------|-------------------|---------|------|------------|
| CartoDB     | Map tiles          | None    | Free | Reasonable |
| OSRM        | Road routing       | None    | Free | Demo server|
| Nominatim   | Geocoding (server) | None    | Free | 1 req/sec  |
| Leaflet     | Map library        | None    | MIT  | N/A        |

All three external services are OpenStreetMap-based ecosystem projects.
