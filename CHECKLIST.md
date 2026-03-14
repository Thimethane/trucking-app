# Pre-Submission Checklist — TruckLogger HOS

Run through this before submitting your GitHub link and Loom video.

## ✅ Backend
- [ ] `cd backend && python manage.py test trips` — all 11 tests pass
- [ ] `cd backend && python manage.py check` — no issues
- [ ] `cd backend && python manage.py runserver` starts without error
- [ ] `POST /api/trips/plan/` returns 200 with `summary`, `daily_logs`, `log_images`, `stops`, `locations`
- [ ] Long trip (NY→LA) returns 4–5 daily log sheets
- [ ] Trip >1,000 mi includes at least one fuel stop
- [ ] Driver at 68h cycle triggers a restart stop

## ✅ Frontend
- [ ] `cd frontend && npm run build` — "Compiled successfully"
- [ ] App loads at `localhost:3000` with dark theme
- [ ] All 5 quick presets load correctly
- [ ] "Cross-country" preset produces a multi-day result
- [ ] Route Map tab: Leaflet map renders, markers visible, OSRM road route drawn
- [ ] HOS Log Grid tab: blocks visible, hover tooltips work, day tabs switch correctly
- [ ] Log Sheets tab: PNG images render, download works, print-all works

## ✅ Deployment
- [ ] Backend live on Render (test the `/api/trips/plan/` endpoint via Postman or curl)
- [ ] Frontend live on Vercel or Render static
- [ ] `REACT_APP_API_URL` env var set to the live backend URL (not localhost)
- [ ] CORS works: browser console shows no CORS errors

## ✅ GitHub Repo
- [ ] Public repository
- [ ] Meaningful commit history (at least 3–5 commits)
- [ ] README.md with setup instructions, API docs, architecture notes
- [ ] `MAPS_AND_APIS.md` explains all free services used
- [ ] `.gitignore` excludes `node_modules/`, `__pycache__/`, `*.pyc`, `.env`
- [ ] No secrets committed (SECRET_KEY, API keys)

## ✅ Loom Video (3–5 min)
- [ ] Shows the app loading live
- [ ] Demonstrates at least one multi-day trip calculation
- [ ] Shows all 3 tabs: Route Map, HOS Log Grid, Log Sheets
- [ ] Briefly shows `compliance_engine.py` code
- [ ] Mentions FMCSA rules enforced
- [ ] Mentions free map APIs used

## ✅ Assessment Requirements
- [x] Django backend ✓
- [x] React + MUI frontend ✓
- [x] 4 inputs: current location, pickup, dropoff, cycle used ✓
- [x] Map with route and stop information ✓
- [x] Daily log sheets drawn/filled out (PNG) ✓
- [x] Multiple log sheets for longer trips ✓
- [x] 70hr/8-day property-carrying assumptions ✓
- [x] Fueling every ≤1,000 miles ✓
- [x] 1 hour for pickup and drop-off ✓
