# Loom Video Script — TruckLogger HOS (3–5 min)

> Use this as a guide for your screen recording. Aim for 4 minutes.
> Suggested tool: [loom.com](https://www.loom.com) — free, no install.

---

## [0:00 – 0:30] Opening — What you built

**Show:** The live hosted URL loading (dark screen → app appears)

**Say:**
> "Hi, I'm [name]. This is TruckLogger HOS — a full-stack FMCSA Hours of Service
> compliance engine I built with Django and React. It takes trip inputs and outputs
> a complete, regulation-compliant route plan with maps, rest scheduling, and printable
> daily log sheets — all enforcing the actual FMCSA property-carrying HOS rules."

---

## [0:30 – 1:15] The Input Form + HOS Rules Panel

**Show:** Left sidebar — hover over each rule badge, point out the cycle slider

**Say:**
> "On the left, the driver enters their current location, pickup, and drop-off —
> all geocoded via OpenStreetMap's Nominatim API on the backend.
> The cycle-used slider sets how many of the 70-hour 8-day limit are already consumed.
> The engine enforces all five FMCSA rules: 11-hour driving limit, 14-hour window,
> 30-minute break after 8 hours driving, the 70-hour rolling cycle, and the 34-hour restart."

**Action:** Load the "Cross-country" preset (NY → Chicago → LA, 0h cycle)

---

## [1:15 – 2:00] Results — Summary + Route Map

**Show:** Hit Calculate, watch the loading steps animate, then show the result

**Say:**
> "The engine plans the full 2,450-mile trip. It found [X] rest stops, [X] fuel stops,
> and the trip spans [X] days. The stop sequence timeline shows every mandatory event."

**Show:** Click to the Route Map tab

**Say:**
> "The map uses real road routing from OSRM — the open-source routing engine — displayed
> on CartoDB dark tiles. Every stop has a colour-coded marker. Pickup is blue, drop-off
> is orange, fuel stops are green, and rest breaks are purple.
> All three services are completely free with no API keys required."

---

## [2:00 – 3:00] HOS Log Grid

**Show:** Click the HOS Log Grid tab — hover over several blocks showing tooltips

**Say:**
> "This interactive 24-hour grid shows exactly how each calendar day is laid out
> across the four duty statuses. Hover any block to see the exact start time, duration,
> location, and miles driven. For a 5-day cross-country run, you can tab through each
> day and see the 10-hour rest periods, the 30-minute mandatory breaks, and the pickup
> and dropoff on-duty time all precisely scheduled."

**Show:** Click through days, hover blocks

---

## [3:00 – 4:00] Log Sheets + Code Walkthrough

**Show:** Click the Log Sheets tab

**Say:**
> "The backend uses Pillow to programmatically render FMCSA § 395.8-style daily log sheets —
> one PNG per calendar day. Each sheet has the 24-hour grid with quarter-hour tick marks,
> colour-coded duty status blocks, per-row totals, a remarks section, and a certification block.
> You can download individual days or print all sheets at once."

**Show:** Download one PNG, zoom in on the sheet

**Show:** Briefly switch to code — `compliance_engine.py`

**Say:**
> "On the backend, the compliance engine is a pure-Python greedy simulation.
> It slices each drive segment into chunks limited by whichever HOS constraint binds first —
> the 11-hour limit, 14-hour window, 30-minute break threshold, or 70-hour cycle.
> Day boundaries are handled by splitting entries at midnight and rolling the 8-day
> cycle array forward."

---

## [4:00 – 4:30] Closing — Stack & Deploy

**Show:** README in GitHub or the render.yaml

**Say:**
> "The stack is Django 4 with DRF on the backend, React 18 with Material UI on the front,
> deployed with a single `render.yaml` that configures both services. There are 11 unit
> tests covering every FMCSA rule assertion. The whole thing runs on free infrastructure —
> Render for the API, Vercel or Render static for the frontend, and three zero-cost map APIs.
> Thanks for watching."

---

## Tips
- Record at 1920×1080 if possible
- Use a dark environment — the app's dark theme will look great
- Have the cross-country preset ready to paste so you don't wait for typing
- The Nominatim geocoder takes ~3 seconds per location — expect a 10-12 second API response on first load
