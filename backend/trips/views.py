from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from .compliance_engine import HOSComplianceEngine
from .log_generator import generate_all_logs
import requests
import time


class TripPlanView(APIView):
    """POST /api/trips/plan/ — Full HOS-compliant trip planning."""

    def post(self, request):
        data = request.data

        # Validate required fields
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
            # Geocode all three locations
            origin_coords  = self._geocode(data["origin"])
            # Nominatim rate limit: 1 req/sec
            time.sleep(1.1)
            pickup_coords  = self._geocode(data["pickup"])
            time.sleep(1.1)
            dropoff_coords = self._geocode(data["dropoff"])

            missing = [
                name for name, coords in [
                    ("origin",  origin_coords),
                    ("pickup",  pickup_coords),
                    ("dropoff", dropoff_coords),
                ] if coords is None
            ]
            if missing:
                return Response(
                    {"error": f"Could not geocode: {', '.join(missing)}. Use 'City, State' format (e.g. 'Chicago, IL')."},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )

            # Run HOS compliance engine
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

            # Inject location names into each daily log (for log sheet header)
            for log in result["daily_logs"]:
                log["origin_name"]  = origin_coords["name"]
                log["dropoff_name"] = dropoff_coords["name"]

            # Generate ELD log sheet PNG images
            result["log_images"] = generate_all_logs(result["daily_logs"])

            # Include geocoded locations for map
            result["locations"] = {
                "origin":  origin_coords,
                "pickup":  pickup_coords,
                "dropoff": dropoff_coords,
            }

            return Response(result, status=http_status.HTTP_200_OK)

        except Exception as exc:
            return Response(
                {"error": f"Server error: {str(exc)}"},
                status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _geocode(self, location: str) -> dict | None:
        """Geocode a location string using Nominatim (free OSM geocoder)."""
        if isinstance(location, dict):
            # Already geocoded — caller passed {lat, lon, name}
            return location
        try:
            resp = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": location,
                    "format": "json",
                    "limit": 1,
                    "countrycodes": "us",
                    "addressdetails": 0,
                },
                headers={"User-Agent": "TruckLoggerHOS/2.0 (assessment project)"},
                timeout=8,
            )
            resp.raise_for_status()
            results = resp.json()
            if not results:
                return None
            r = results[0]
            return {
                "name":         location,
                "display_name": r.get("display_name", location),
                "lat":          float(r["lat"]),
                "lon":          float(r["lon"]),
            }
        except Exception:
            return None


class GeocodeView(APIView):
    """GET /api/trips/geocode/?q=Chicago,+IL — Autocomplete suggestions."""

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response({"error": "Missing query param 'q'"}, status=400)
        try:
            resp = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": q, "format": "json", "limit": 5, "countrycodes": "us"},
                headers={"User-Agent": "TruckLoggerHOS/2.0"},
                timeout=5,
            )
            data = resp.json()
            suggestions = [
                {
                    "name":  d.get("display_name", ""),
                    "short": ", ".join(d.get("display_name", "").split(", ")[:2]),
                    "lat":   float(d["lat"]),
                    "lon":   float(d["lon"]),
                }
                for d in data
            ]
            return Response({"suggestions": suggestions})
        except Exception as exc:
            return Response({"error": str(exc)}, status=500)
