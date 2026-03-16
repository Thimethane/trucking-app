# TruckLogger HOS — Test Plan & Scenarios

**App:** TruckLogger HOS — FMCSA Compliance Engine  
**Backend:** Django REST API + HOS compliance engine  
**Frontend:** React + MUI  
**Regulation:** 49 CFR Part 395 — Property-Carrying Vehicles

---

## Known Issue: Render Free Tier Cold Start

> **Error:** `Connection failed — is the backend running at https://trucking-app-mxqx.onrender.com?`

**Cause:** Render's free tier spins the backend down after 15 minutes of inactivity.  
**Fix:** Wait 30–60 seconds and try again — the first request wakes it up.  
**Long-term fix:** Upgrade to a paid Render instance, or add a cron ping to keep it warm.

---

## Offline Verification (No Internet Required)

Run these directly against the Python engine — no server needed.

```bash
cd trucking-app/backend
python manage.py test trips --verbosity=2
```

Expected output: **11/11 tests OK**

To generate log sheet PNGs locally:

```bash
python manage.py shell
```

```python
from trips.compliance_engine import HOSComplianceEngine
from trips.log_generator import generate_all_logs
import base64

e = HOSComplianceEngine()
r = e.calculate_trip(
    'New York, NY',    40.712, -74.005,
    'Chicago, IL',     41.878, -87.629,
    'Los Angeles, CA', 34.052, -118.243,
    current_cycle_used=0
)

for log in r['daily_logs']:
    log['origin_name']  = 'New York, NY'
    log['dropoff_name'] = 'Los Angeles, CA'

for i, img in enumerate(generate_all_logs(r['daily_logs'])):
    open(f'/tmp/day{i+1}.png', 'wb').write(base64.b64decode(img))
    print(f'Saved /tmp/day{i+1}.png')
```

---

## Test Scenarios

---

### TC-01 · Short Trip — Single Day

| Field | Value |
|-------|-------|
| Origin | Miami, FL |
| Pickup | Jacksonville, FL |
| Dropoff | Atlanta, GA |
| Cycle Used | 10h |

**Expected Results:**

- Total miles: ~660 mi
- Trip days: 1–2
- Fuel stops: 0 (under 1,000 mi threshold)
- Rest stops: 1–2
- No restart stop
- Every driving block ≤ 11.0h

**Log Sheet Checks:**

- [ ] FROM shows Miami, FL / TO shows Atlanta, GA
- [ ] Odometer starts at 0
- [ ] HOS COMPLIANT badge visible in green
- [ ] Driving row shows coloured blocks
- [ ] Totals bar sums to 24.0h

---

### TC-02 · Cross-Country — Multi-Day

| Field | Value |
|-------|-------|
| Origin | New York, NY |
| Pickup | Chicago, IL |
| Dropoff | Los Angeles, CA |
| Cycle Used | 0h |

**Expected Results:**

- Total miles: ~2,453 mi
- Trip days: 5
- Fuel stops: 2
- Rest stops: 4+
- Each day: exactly 11.0h driving (except final short day)
- 5 log sheets generated

**Log Sheet Checks:**

- [ ] Day 1–4: driving total = 11.0h
- [ ] Day 5: short final leg, driving < 11.0h
- [ ] Odometer end of Day N = odometer start of Day N+1
- [ ] Fuel stops appear in Remarks section
- [ ] Quarter-hour tick marks visible on grid

---

### TC-03 · Near-Maxed Cycle — 34-Hr Restart

| Field | Value |
|-------|-------|
| Origin | Seattle, WA |
| Pickup | Portland, OR |
| Dropoff | San Francisco, CA |
| Cycle Used | 68h |

**Expected Results:**

- 🔄 Restart stop appears in stop sequence timeline
- Trip duration longer than if cycle were 0h
- Log sheet shows long consecutive off-duty block (≥ 34h)
- After restart, driving resumes normally

**What to verify:**

- [ ] Stop timeline shows a restart chip
- [ ] HOS grid shows a large blue off-duty block spanning the restart
- [ ] Summary stat cards show rest stops > 1

---

### TC-04 · Fuel Stop Trigger

| Field | Value |
|-------|-------|
| Origin | Los Angeles, CA |
| Pickup | Phoenix, AZ |
| Dropoff | Dallas, TX |
| Cycle Used | 0h |

**Expected Results:**

- Total miles: ~1,400 mi
- At least 1 ⛽ fuel stop
- Fuel stop visible on route map with popup
- Fuel stop appears in stop sequence and log sheet remarks

**What to verify:**

- [ ] ⛽ chip appears in stop sequence
- [ ] Map marker at fuel stop, popup shows "Fuel Stop · Day X · 0.5h"
- [ ] Log sheet remarks: "Fuel Stop @ ~1000 mi mark"

---

### TC-05 · Cycle Slider Behaviour

Drag the cycle slider through these values and check the availability badge:

| Slider Value | Badge Colour | Badge Text |
|---|---|---|
| 0h | Green | 70h AVAILABLE |
| 35h | Amber | 35h AVAILABLE |
| 60h | Red-amber | 10h AVAILABLE |
| 70h | Red | 0h AVAILABLE |

---

### TC-06 · All 5 Quick Presets

Click each preset and submit. Verify the map **fully resets** between runs (no ghost markers from the prior trip).

| Preset | Expected Miles | Expected Days |
|--------|---------------|---------------|
| LA → Dallas | ~1,400 mi | 3–4 |
| NY → Chicago | ~790 mi | 2 |
| Seattle → SF | ~810 mi | 2 |
| Miami → Atlanta | ~660 mi | 1–2 |
| Cross-country | ~2,453 mi | 5 |

---

### TC-07 · Tab Navigation

After any successful result, click through all three tabs:

| Tab | Items to Check |
|-----|----------------|
| 🗺 Route Map | Route polyline renders; markers clickable; popups show day/duration/mile; OSRM distance chip in toolbar |
| 📊 HOS Grid | Day selector tabs work; coloured blocks fill correct hour columns; hovering shows tooltip with label, time, location |
| 📋 Log Sheets | Thumbnail strip shows all days; zoom in/out (50%–200%) works; Download Day PNG saves correctly |

---

### TC-08 · Log Sheet Download

On the Log Sheets tab:

- [ ] **Download Day 1** — PNG saves and opens in image viewer
- [ ] **Download All** — one PNG per day saved
- [ ] Zoomed to 150% — sheet remains sharp and readable
- [ ] Print button opens a new browser tab with all sheets

---

### TC-09 · Form Validation — Empty Fields

Leave all location fields blank and click **Calculate Compliant Route**.

**Expected:**

- [ ] All three location fields highlight red
- [ ] Helper text "Required" appears under each
- [ ] No API call is made (no loading bar, no spinner)

---

### TC-10 · Error Handling — Bad Location

| Field | Value |
|-------|-------|
| Origin | asdfghjkl |
| Pickup | Chicago, IL |
| Dropoff | Dallas, TX |

**Expected:**

- [ ] Red alert banner appears: *"Could not geocode: origin"*
- [ ] App remains usable — form stays filled
- [ ] No crash, no blank screen

---

### TC-11 · FMCSA Rule Assertions (Unit Tests)

These run offline via `python manage.py test trips --verbosity=2`:

| Test | Rule | Pass Condition |
|------|------|----------------|
| `test_no_day_exceeds_11h_driving` | 11-HR | No DayLog.total_driving > 11.05h |
| `test_high_cycle_triggers_restart` | 70-HR / 34-HR RST | `restart` appears in stop_types |
| `test_fuel_stop_over_1000_miles` | 1,000-mi fuel | fuel_stops > 0 for trips > 1,000 mi |
| `test_no_fuel_stop_under_1000_miles` | 1,000-mi fuel | fuel_stops = 0 for trips < 1,000 mi |
| `test_multi_day_odometers_are_sequential` | Data integrity | odometer_end[N] ≥ odometer_start[N+1] |
| `test_entry_start_hours_in_range` | Data integrity | All start_hour values in [0, 24] |
| `test_all_days_have_entries` | Data integrity | Every DayLog has ≥ 1 entry |
| `test_log_images_generated` | Log sheets | Image count = day count, each > 1KB |
| `test_pickup_and_dropoff_stops_always_present` | Stops | Exactly 1 pickup + 1 dropoff per trip |
| `test_cross_country_is_multi_day` | Multi-day | NY→LA spans > 1 day |
| `test_short_trip_single_day` | Short trip | Chicago→Indy→Cincinnati ≤ 2 days |

---

## Log Sheet Visual Checklist

Open any generated PNG and verify:

| Section | Expected |
|---------|----------|
| Header title | "DRIVER'S DAILY LOG" in white on dark background |
| Orange accent | Left edge stripe + "DAY N" label in orange |
| Green badge | "✓ HOS COMPLIANT — FMCSA § 395.3 Verified" |
| Info band | FROM / TO / CARRIER / VEH# fields populated |
| Hour ruler | Labels at Midnight / 6AM / Noon / 6PM / Midnight with quarter-hour ticks |
| TOTAL column | Per-row hour totals in matching status colour |
| Status rows | 1 OFF DUTY (blue) / 2 SLEEPER (indigo) / 3 DRIVING (red) / 4 ON DUTY ND (green) |
| Duty blocks | Coloured rectangles spanning correct hour range, label inside if wide enough |
| Totals bar | 5 coloured cells: OFF / SLEEPER / DRIVING / ON DUTY ND / TOTAL summing to 24.0h |
| Remarks | Notable events listed with colour dots (rest, pickup, fuel, break) |
| Certification | Signature / Date / Co-Driver blank lines at bottom right |

---

## Fix for Render Cold Start (for the video)

To avoid the cold start issue during recording, hit the backend URL directly in the browser **2 minutes before** you start:

```
https://trucking-app-mxqx.onrender.com/api/trips/geocode/?q=Chicago
```

If you see JSON back, the backend is warm and ready.
