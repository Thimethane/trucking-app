# Architecture — TruckLogger HOS

## System Overview

```
Browser (React)
    │
    │  POST /api/trips/plan/  { origin, pickup, dropoff, current_cycle_used }
    ▼
Django REST API (DRF)
    │
    ├─► Nominatim (OSM)     ← Geocode location strings → lat/lon
    │
    ├─► HOSComplianceEngine ← Core algorithm (Python, no dependencies)
    │       │
    │       ├── Haversine distance calculator
    │       ├── Drive segment planner (greedy HOS constraint solver)
    │       ├── 8-day rolling cycle tracker
    │       └── Mandatory stop scheduler (breaks, fuel, rest)
    │
    └─► LogGenerator (Pillow)
            └── Renders 24-hr grid PNG for each calendar day
                
Response: JSON { summary, stops[], daily_logs[], log_images[], waypoints[] }
    │
    ▼
Browser renders:
    ├── TripSummary    (stat cards + stop timeline)
    ├── RouteMap       (Leaflet + CartoDB + OSRM real-road path)
    ├── HOSLogGrid     (interactive 24-hr React grid, tooltip on hover)
    └── LogSheetViewer (PNG images + download + print-all)
```

## Compliance Engine State Machine

Each "drive segment" call runs this loop:

```
WHILE remaining_miles > 0:
    check_can_drive()
        → 11hr limit?    → do_10hr_off_duty()
        → 14hr window?   → do_10hr_off_duty()
        → break needed?  → do_30min_break()
        → 70hr cycle?    → do_34hr_restart()
    
    max_hours = MIN(
        11h - driving_today,
        14h - on_duty_window,
        8h  - drive_since_break,
        70h - cycle_total,
        24h - current_hour   ← day boundary
    )
    
    max_miles = MIN(remaining, max_hours × 55, 1000 - miles_since_fuel)
    
    add_entry(DRIVING, max_miles/55, ...)
    remaining -= max_miles
    
    IF miles_since_fuel >= 1000:
        add_entry(ON_DUTY_ND, 0.5, "Fuel Stop")
        miles_since_fuel = 0

AT MIDNIGHT:
    current_day += 1
    cycle[0..6] = cycle[1..7]   ← oldest day drops
    cycle[7] = 0
    driving_today = 0            ← calendar-day reset
```

## Key Design Decisions

1. **Backend geocoding** — Nominatim requires a User-Agent header and has CORS restrictions; proxying through Django avoids both issues.

2. **Greedy constraint solver** — HOS rules are checked at every loop iteration. The approach finds valid driving windows without look-ahead, matching real-world ELD behavior.

3. **Midnight split** — Log entries that cross midnight are split at 00:00, producing separate entries on each calendar day. This is essential for accurate per-day totals.

4. **OSRM graceful fallback** — If OSRM times out (it's a public demo server), the map falls back to a straight-line polyline. The distance calculation always uses Haversine, so HOS calculations are unaffected.

5. **Pillow log sheets** — Rendering programmatically (rather than using a PDF template) gives pixel-precise control over the 24-hr grid and allows dynamic color-coding of each duty status.
