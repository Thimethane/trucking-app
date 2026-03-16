from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from .compliance_engine import HOSComplianceEngine
from .log_generator import generate_all_logs
import requests
import time
import logging

logger = logging.getLogger(__name__)

# ── Built-in coordinate table ─────────────────────────────────────────────────
# Used when Nominatim is blocked or unavailable (e.g. Render free tier IPs)
CITY_COORDS = {
    "new york":           {"lat": 40.7128, "lon": -74.0060},
    "new york, ny":       {"lat": 40.7128, "lon": -74.0060},
    "los angeles":        {"lat": 34.0522, "lon": -118.2437},
    "los angeles, ca":    {"lat": 34.0522, "lon": -118.2437},
    "chicago":            {"lat": 41.8781, "lon": -87.6298},
    "chicago, il":        {"lat": 41.8781, "lon": -87.6298},
    "houston":            {"lat": 29.7604, "lon": -95.3698},
    "houston, tx":        {"lat": 29.7604, "lon": -95.3698},
    "dallas":             {"lat": 32.7767, "lon": -96.7970},
    "dallas, tx":         {"lat": 32.7767, "lon": -96.7970},
    "phoenix":            {"lat": 33.4484, "lon": -112.0740},
    "phoenix, az":        {"lat": 33.4484, "lon": -112.0740},
    "philadelphia":       {"lat": 39.9526, "lon": -75.1652},
    "philadelphia, pa":   {"lat": 39.9526, "lon": -75.1652},
    "san antonio":        {"lat": 29.4241, "lon": -98.4936},
    "san antonio, tx":    {"lat": 29.4241, "lon": -98.4936},
    "san diego":          {"lat": 32.7157, "lon": -117.1611},
    "san diego, ca":      {"lat": 32.7157, "lon": -117.1611},
    "san francisco":      {"lat": 37.7749, "lon": -122.4194},
    "san francisco, ca":  {"lat": 37.7749, "lon": -122.4194},
    "seattle":            {"lat": 47.6062, "lon": -122.3321},
    "seattle, wa":        {"lat": 47.6062, "lon": -122.3321},
    "denver":             {"lat": 39.7392, "lon": -104.9903},
    "denver, co":         {"lat": 39.7392, "lon": -104.9903},
    "miami":              {"lat": 25.7617, "lon": -80.1918},
    "miami, fl":          {"lat": 25.7617, "lon": -80.1918},
    "atlanta":            {"lat": 33.7490, "lon": -84.3880},
    "atlanta, ga":        {"lat": 33.7490, "lon": -84.3880},
    "boston":             {"lat": 42.3601, "lon": -71.0589},
    "boston, ma":         {"lat": 42.3601, "lon": -71.0589},
    "nashville":          {"lat": 36.1627, "lon": -86.7816},
    "nashville, tn":      {"lat": 36.1627, "lon": -86.7816},
    "portland":           {"lat": 45.5051, "lon": -122.6750},
    "portland, or":       {"lat": 45.5051, "lon": -122.6750},
    "las vegas":          {"lat": 36.1699, "lon": -115.1398},
    "las vegas, nv":      {"lat": 36.1699, "lon": -115.1398},
    "minneapolis":        {"lat": 44.9778, "lon": -93.2650},
    "minneapolis, mn":    {"lat": 44.9778, "lon": -93.2650},
    "detroit":            {"lat": 42.3314, "lon": -83.0458},
    "detroit, mi":        {"lat": 42.3314, "lon": -83.0458},
    "indianapolis":       {"lat": 39.7684, "lon": -86.1581},
    "indianapolis, in":   {"lat": 39.7684, "lon": -86.1581},
    "jacksonville":       {"lat": 30.3322, "lon": -81.6557},
    "jacksonville, fl":   {"lat": 30.3322, "lon": -81.6557},
    "columbus":           {"lat": 39.9612, "lon": -82.9988},
    "columbus, oh":       {"lat": 39.9612, "lon": -82.9988},
    "charlotte":          {"lat": 35.2271, "lon": -80.8431},
    "charlotte, nc":      {"lat": 35.2271, "lon": -80.8431},
    "memphis":            {"lat": 35.1495, "lon": -90.0490},
    "memphis, tn":        {"lat": 35.1495, "lon": -90.0490},
    "baltimore":          {"lat": 39.2904, "lon": -76.6122},
    "baltimore, md":      {"lat": 39.2904, "lon": -76.6122},
    "albuquerque":        {"lat": 35.0844, "lon": -106.6504},
    "albuquerque, nm":    {"lat": 35.0844, "lon": -106.6504},
    "kansas city":        {"lat": 39.0997, "lon": -94.5786},
    "kansas city, mo":    {"lat": 39.0997, "lon": -94.5786},
    "tucson":             {"lat": 32.2226, "lon": -110.9747},
    "tucson, az":         {"lat": 32.2226, "lon": -110.9747},
    "omaha":              {"lat": 41.2565, "lon": -95.9345},
    "omaha, ne":          {"lat": 41.2565, "lon": -95.9345},
    "st. louis":          {"lat": 38.6270, "lon": -90.1994},
    "st. louis, mo":      {"lat": 38.6270, "lon": -90.1994},
    "cincinnati":         {"lat": 39.1031, "lon": -84.5120},
    "cincinnati, oh":     {"lat": 39.1031, "lon": -84.5120},
    "pittsburgh":         {"lat": 40.4406, "lon": -79.9959},
    "pittsburgh, pa":     {"lat": 40.4406, "lon": -79.9959},
    "salt lake city":     {"lat": 40.7608, "lon": -111.8910},
    "salt lake city, ut": {"lat": 40.7608, "lon": -111.8910},
    "richmond":           {"lat": 37.5407, "lon": -77.4360},
    "richmond, va":       {"lat": 37.5407, "lon": -77.4360},
    "sacramento":         {"lat": 38.5816, "lon": -121.4944},
    "sacramento, ca":     {"lat": 38.5816, "lon": -121.4944},
}


def _lookup_fallback(location: str) -> dict | None:
    """Fast O(1) lookup in built-in city table."""
    key = location.strip().lower()
    coords = CITY_COORDS.get(key) or CITY_COORDS.get(key.split(",")[0].strip())
    if coords:
        return {
            "name": location, "display_name": location,
            "lat": coords["lat"], "lon": coords["lon"],
        }
    return None


def _nominatim(location: str) -> dict | None:
    """Try Nominatim OSM geocoder. Returns None on any failure."""
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": location, "format": "json", "limit": 1,
                    "countrycodes": "us", "addressdetails": 0},
            headers={
                "User-Agent": "TruckLoggerHOS/2.0 (sphe7243@gmail.com)",
                "Accept": "application/json",
            },
            timeout=5,
        )
        ct = resp.headers.get("Content-Type", "")
        if resp.status_code == 200 and "application/json" in ct:
            results = resp.json()
            if results:
                r = results[0]
                return {
                    "name": location,
                    "display_name": r.get("display_name", location),
                    "lat": float(r["lat"]),
                    "lon": float(r["lon"]),
                }
        logger.warning(f"Nominatim non-JSON for '{location}': {resp.status_code} {ct[:60]}")
    except Exception as e:
        logger.warning(f"Nominatim error for '{location}': {e}")
    return None


def geocode(location: str) -> dict | None:
    """
    Geocode with instant fallback:
    1. Check built-in table first (instant, no network)
    2. Try Nominatim only if not in table
    """
    if isinstance(location, dict):
        return location

    # Always try the table first — it's instant and reliable
    result = _lookup_fallback(location)
    if result:
        logger.info(f"Geocoded '{location}' from table")
        return result

    # Only hit Nominatim for cities not in our table
    logger.info(f"'{location}' not in table, trying Nominatim...")
    return _nominatim(location)


class TripPlanView(APIView):
    """POST /api/trips/plan/"""

    def post(self, request):
        data = request.data

        for field in ["origin", "pickup", "dropoff", "current_cycle_used"]:
            if field not in data:
                return Response(
                    {"error": f"Missing required field: '{field}'"},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )

        try:
            current_cycle = max(0.0, min(70.0, float(data["current_cycle_used"])))
        except (TypeError, ValueError):
            return Response(
                {"error": "current_cycle_used must be a number between 0 and 70"},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        try:
            origin_coords  = geocode(data["origin"])
            pickup_coords  = geocode(data["pickup"])
            dropoff_coords = geocode(data["dropoff"])

            # Only sleep between Nominatim calls (respect rate limit)
            # No sleep needed when using the built-in table
            needs_nominatim = any(
                _lookup_fallback(loc) is None
                for loc in [data["origin"], data["pickup"], data["dropoff"]]
                if isinstance(loc, str)
            )
            if needs_nominatim:
                time.sleep(1.1)

            missing = [
                name for name, coords in [
                    ("origin", origin_coords),
                    ("pickup", pickup_coords),
                    ("dropoff", dropoff_coords),
                ] if coords is None
            ]
            if missing:
                return Response(
                    {"error": f"Could not geocode: {', '.join(missing)}. Try 'City, State' e.g. 'Chicago, IL'."},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )

            engine = HOSComplianceEngine()
            result = engine.calculate_trip(
                origin_name=origin_coords["name"],
                origin_lat=origin_coords["lat"],
                origin_lon=origin_coords["lon"],
                pickup_name=pickup_coords["name"],
                pickup_lat=pickup_coords["lat"],
                pickup_lon=pickup_coords["lon"],
                dropoff_name=dropoff_coords["name"],
                dropoff_lat=dropoff_coords["lat"],
                dropoff_lon=dropoff_coords["lon"],
                current_cycle_used=current_cycle,
            )

            for log in result["daily_logs"]:
                log["origin_name"]  = origin_coords["name"]
                log["dropoff_name"] = dropoff_coords["name"]

            result["log_images"] = generate_all_logs(result["daily_logs"])
            result["locations"]  = {
                "origin":  origin_coords,
                "pickup":  pickup_coords,
                "dropoff": dropoff_coords,
            }

            return Response(result, status=http_status.HTTP_200_OK)

        except Exception as exc:
            logger.exception("Trip plan error")
            return Response(
                {"error": f"Server error: {str(exc)}"},
                status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GeocodeView(APIView):
    """GET /api/trips/geocode/?q=Chicago"""

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response({"error": "Missing query param 'q'"}, status=400)

        # Search built-in table first
        q_lower = q.lower()
        matches = [
            {"name": k, "short": k, "lat": v["lat"], "lon": v["lon"], "source": "table"}
            for k, v in CITY_COORDS.items()
            if q_lower in k and "," in k
        ][:5]

        if matches:
            return Response({"suggestions": matches, "source": "table"})

        # Fall back to Nominatim
        result = _nominatim(q)
        if result:
            return Response({
                "suggestions": [{
                    "name": result["display_name"],
                    "short": result["name"],
                    "lat": result["lat"],
                    "lon": result["lon"],
                    "source": "nominatim",
                }],
                "source": "nominatim",
            })

        return Response({"suggestions": [], "source": "none"})
