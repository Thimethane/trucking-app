"""
FMCSA Hours of Service (HOS) Compliance Engine — v2
Property-Carrying Driver Rules (70hr/8-day)
"""
from dataclasses import dataclass, field
from typing import List, Tuple
from enum import Enum
import math


class DutyStatus(Enum):
    OFF_DUTY   = "off_duty"
    SLEEPER    = "sleeper"
    DRIVING    = "driving"
    ON_DUTY_ND = "on_duty_nd"


@dataclass
class LogEntry:
    status: DutyStatus
    duration_hours: float
    label: str
    location: str
    start_hour: float   # 0-24 within the day
    day: int            # 0-indexed
    miles: float = 0.0


@dataclass
class DayLog:
    day_number: int
    date_label: str
    entries: List[LogEntry] = field(default_factory=list)
    total_driving: float = 0.0
    total_on_duty: float = 0.0
    total_off_duty: float = 0.0
    odometer_start: float = 0.0
    odometer_end: float = 0.0


@dataclass
class TripStop:
    name: str
    stop_type: str
    location: str
    lat: float
    lon: float
    duration_hours: float
    status: DutyStatus
    cumulative_miles: float
    day: int
    hour_in_day: float


class HOSComplianceEngine:
    AVG_SPEED_MPH          = 55.0
    FUEL_INTERVAL_MILES    = 1000.0
    PICKUP_DURATION        = 1.0
    DROPOFF_DURATION       = 1.0
    FUEL_DURATION          = 0.5
    BREAK_DURATION         = 0.5   # 30-min mandatory break
    REQUIRED_OFF_DUTY      = 10.0  # consecutive off before new shift
    RESTART_THRESHOLD      = 34.0  # 34-hr restart resets 70-hr clock
    MAX_DRIVING_SHIFT      = 11.0
    MAX_WINDOW             = 14.0
    BREAK_AFTER_DRIVING    = 8.0

    def calculate_trip(
        self,
        origin_name: str, origin_lat: float, origin_lon: float,
        pickup_name: str, pickup_lat: float, pickup_lon: float,
        dropoff_name: str, dropoff_lat: float, dropoff_lon: float,
        current_cycle_used: float = 0.0,
    ) -> dict:

        d_to_pickup        = self._haversine(origin_lat, origin_lon, pickup_lat, pickup_lon)
        d_pickup_to_drop   = self._haversine(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)
        total_miles        = d_to_pickup + d_pickup_to_drop

        # ── mutable trip state ──────────────────────────────────────────────
        logs: List[DayLog]   = []
        stops: List[TripStop] = []

        # HOS counters
        driving_today     = 0.0   # resets each calendar day & after 10hr off
        on_duty_window    = 0.0   # since last came on-duty (14-hr clock)
        drive_since_break = 0.0   # since last 30-min break
        consec_off        = 0.0   # consecutive off-duty hours
        miles_since_fuel  = 0.0
        total_miles_driven = 0.0

        # 8-day rolling cycle — index 0 = oldest (drops off), index 7 = today
        cycle = [0.0] * 8
        if current_cycle_used > 0:
            per_day = current_cycle_used / min(7, max(1, 7))
            for i in range(7):
                cycle[i] = per_day

        current_day  = 0
        current_hour = 7.0   # trip starts at 07:00

        # ── helpers ─────────────────────────────────────────────────────────
        def get_log(day_idx: int) -> DayLog:
            while len(logs) <= day_idx:
                logs.append(DayLog(
                    day_number=len(logs) + 1,
                    date_label=f"Day {len(logs) + 1}",
                    odometer_start=total_miles_driven,
                ))
            return logs[day_idx]

        def cycle_used() -> float:
            return sum(cycle)

        def cycle_avail() -> float:
            return max(0.0, 70.0 - cycle_used())

        def can_drive() -> Tuple[bool, str]:
            if driving_today   >= self.MAX_DRIVING_SHIFT: return False, "11hr_limit"
            if on_duty_window  >= self.MAX_WINDOW:        return False, "14hr_window"
            if drive_since_break >= self.BREAK_AFTER_DRIVING: return False, "break_needed"
            if cycle_avail()   <= 0.0:                    return False, "70hr_cycle"
            return True, "ok"

        def add_entry(status: DutyStatus, hours: float, label: str, loc: str, miles: float = 0.0):
            nonlocal current_hour, current_day, driving_today, on_duty_window
            nonlocal drive_since_break, consec_off, miles_since_fuel, total_miles_driven

            remaining = hours
            while remaining > 0.001:
                hours_till_midnight = 24.0 - current_hour
                chunk = min(remaining, hours_till_midnight)

                entry = LogEntry(
                    status=status,
                    duration_hours=round(chunk, 4),
                    label=label,
                    location=loc,
                    start_hour=current_hour,
                    day=current_day,
                    miles=round(miles * (chunk / hours), 2) if hours > 0 else 0.0,
                )
                log = get_log(current_day)
                log.entries.append(entry)

                if status == DutyStatus.DRIVING:
                    m = miles * (chunk / hours) if hours > 0 else 0.0
                    log.total_driving   += chunk
                    driving_today       += chunk
                    on_duty_window      += chunk
                    drive_since_break   += chunk
                    cycle[7]            += chunk
                    miles_since_fuel    += m
                    total_miles_driven  += m
                    log.odometer_end     = total_miles_driven
                    consec_off           = 0.0
                elif status == DutyStatus.ON_DUTY_ND:
                    log.total_on_duty   += chunk
                    on_duty_window      += chunk
                    cycle[7]            += chunk
                    consec_off           = 0.0
                else:  # OFF / SLEEPER
                    log.total_off_duty  += chunk
                    consec_off          += chunk
                    # 34-hr restart check
                    if consec_off >= self.RESTART_THRESHOLD:
                        cycle[:] = [0.0] * 8
                    # 10-hr off resets shift clocks
                    if consec_off >= self.REQUIRED_OFF_DUTY:
                        driving_today    = 0.0
                        on_duty_window   = 0.0

                current_hour += chunk
                remaining    -= chunk

                # Midnight rollover
                if current_hour >= 24.0 - 0.001:
                    current_hour = 0.0
                    current_day += 1
                    # Roll the 8-day window: oldest day drops off
                    cycle[:] = cycle[1:] + [0.0]
                    # Reset calendar-day driving counter (but NOT shift counters
                    # unless we get 10hr off separately)
                    driving_today = 0.0
                    get_log(current_day).odometer_start = total_miles_driven

        def do_break(loc: str, lat: float = 0, lon: float = 0):
            nonlocal drive_since_break
            add_entry(DutyStatus.OFF_DUTY, self.BREAK_DURATION, "30-Min Mandatory Break", loc)
            drive_since_break = 0.0
            stops.append(TripStop("Rest Break", "rest", loc, lat, lon,
                                  self.BREAK_DURATION, DutyStatus.OFF_DUTY,
                                  total_miles_driven, current_day,
                                  current_hour - self.BREAK_DURATION))

        def do_10hr_off(loc: str, lat: float = 0, lon: float = 0):
            nonlocal driving_today, on_duty_window, drive_since_break
            add_entry(DutyStatus.OFF_DUTY, self.REQUIRED_OFF_DUTY, "10-Hour Rest Period", loc)
            driving_today    = 0.0
            on_duty_window   = 0.0
            drive_since_break = 0.0
            stops.append(TripStop("10-Hr Rest", "rest", loc, lat, lon,
                                  self.REQUIRED_OFF_DUTY, DutyStatus.OFF_DUTY,
                                  total_miles_driven, current_day,
                                  current_hour - self.REQUIRED_OFF_DUTY))

        def do_34hr_restart(loc: str, lat: float = 0, lon: float = 0):
            nonlocal driving_today, on_duty_window, drive_since_break
            add_entry(DutyStatus.OFF_DUTY, self.RESTART_THRESHOLD, "34-Hour Restart", loc)
            driving_today    = 0.0
            on_duty_window   = 0.0
            drive_since_break = 0.0
            cycle[:] = [0.0] * 8
            stops.append(TripStop("34-Hr Restart", "restart", loc, lat, lon,
                                  self.RESTART_THRESHOLD, DutyStatus.OFF_DUTY,
                                  total_miles_driven, current_day,
                                  current_hour - self.RESTART_THRESHOLD))

        def drive_segment(dist: float, from_loc: str, to_loc: str,
                          from_lat: float, from_lon: float,
                          to_lat: float, to_lon: float):
            nonlocal miles_since_fuel
            remaining = dist
            safety = 0

            while remaining > 0.5 and safety < 500:
                safety += 1
                ok, reason = can_drive()

                if not ok:
                    frac = 1.0 - remaining / dist
                    cur_lat = from_lat + (to_lat - from_lat) * frac
                    cur_lon = from_lon + (to_lon - from_lon) * frac

                    if reason == "break_needed":
                        do_break(from_loc, cur_lat, cur_lon)
                    elif reason in ("11hr_limit", "14hr_window"):
                        do_10hr_off(from_loc, cur_lat, cur_lon)
                    else:  # 70hr
                        do_34hr_restart(from_loc, cur_lat, cur_lon)
                    continue

                # Max drivable before next constraint
                avail_drive  = self.MAX_DRIVING_SHIFT - driving_today
                avail_window = self.MAX_WINDOW        - on_duty_window
                avail_break  = self.BREAK_AFTER_DRIVING - drive_since_break
                avail_cycle  = cycle_avail()
                avail_day    = 24.0 - current_hour  # time left today
                # Guard: current DayLog must not exceed 11h total driving
                avail_log    = self.MAX_DRIVING_SHIFT - get_log(current_day).total_driving

                max_hrs = min(avail_drive, avail_window, avail_break,
                              avail_cycle, avail_day, avail_log)
                max_hrs = max(max_hrs, 0.0)

                if max_hrs < 0.05:
                    frac = 1.0 - remaining / dist
                    cur_lat = from_lat + (to_lat - from_lat) * frac
                    cur_lon = from_lon + (to_lon - from_lon) * frac
                    do_10hr_off(from_loc, cur_lat, cur_lon)
                    continue

                # Respect fuel interval
                miles_to_fuel  = self.FUEL_INTERVAL_MILES - miles_since_fuel
                max_drive_mi   = min(remaining,
                                     max_hrs * self.AVG_SPEED_MPH,
                                     miles_to_fuel)
                drive_hrs      = max_drive_mi / self.AVG_SPEED_MPH

                add_entry(DutyStatus.DRIVING, drive_hrs,
                          f"Driving → {to_loc}", from_loc, max_drive_mi)
                remaining -= max_drive_mi

                # Fuel stop if needed
                if miles_since_fuel >= self.FUEL_INTERVAL_MILES - 0.5 and remaining > 0.5:
                    frac = 1.0 - remaining / dist
                    cur_lat = from_lat + (to_lat - from_lat) * frac
                    cur_lon = from_lon + (to_lon - from_lon) * frac
                    add_entry(DutyStatus.ON_DUTY_ND, self.FUEL_DURATION,
                              "Fuel Stop", f"~{int(total_miles_driven)} mi mark")
                    miles_since_fuel = 0.0
                    stops.append(TripStop(
                        f"Fuel Stop (~{int(total_miles_driven)} mi)", "fuel",
                        f"Mile {int(total_miles_driven)}", cur_lat, cur_lon,
                        self.FUEL_DURATION, DutyStatus.ON_DUTY_ND,
                        total_miles_driven, current_day, current_hour - self.FUEL_DURATION
                    ))

        # ── EXECUTE TRIP ────────────────────────────────────────────────────

        # Pre-trip inspection
        add_entry(DutyStatus.ON_DUTY_ND, 0.5, "Pre-Trip Inspection", origin_name)

        # Leg 1: origin → pickup
        if d_to_pickup > 0.5:
            drive_segment(d_to_pickup, origin_name, pickup_name,
                          origin_lat, origin_lon, pickup_lat, pickup_lon)

        # Pickup
        add_entry(DutyStatus.ON_DUTY_ND, self.PICKUP_DURATION, "Pickup / Loading", pickup_name)
        stops.append(TripStop(pickup_name, "pickup", pickup_name,
                               pickup_lat, pickup_lon, self.PICKUP_DURATION,
                               DutyStatus.ON_DUTY_ND, total_miles_driven,
                               current_day, current_hour - self.PICKUP_DURATION))

        # Leg 2: pickup → dropoff
        drive_segment(d_pickup_to_drop, pickup_name, dropoff_name,
                      pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)

        # Dropoff
        add_entry(DutyStatus.ON_DUTY_ND, self.DROPOFF_DURATION, "Dropoff / Unloading", dropoff_name)
        stops.append(TripStop(dropoff_name, "dropoff", dropoff_name,
                               dropoff_lat, dropoff_lon, self.DROPOFF_DURATION,
                               DutyStatus.ON_DUTY_ND, total_miles_driven,
                               current_day, current_hour - self.DROPOFF_DURATION))

        # End-of-trip rest
        add_entry(DutyStatus.OFF_DUTY, self.REQUIRED_OFF_DUTY,
                  "Post-Trip Rest", dropoff_name)

        # ── FINALIZE ────────────────────────────────────────────────────────
        for log in logs:
            log.odometer_end = max(log.odometer_end, log.odometer_start)

        return {
            "summary": {
                "total_miles":                  round(total_miles, 1),
                "total_days":                   len(logs),
                "distance_to_pickup":           round(d_to_pickup, 1),
                "distance_pickup_to_dropoff":   round(d_pickup_to_drop, 1),
                "estimated_drive_hours":        round(total_miles / self.AVG_SPEED_MPH, 1),
                "fuel_stops":                   len([s for s in stops if s.stop_type == "fuel"]),
                "rest_stops":                   len([s for s in stops if s.stop_type in ("rest","restart")]),
            },
            "stops":      [self._stop_dict(s) for s in stops],
            "daily_logs": [self._log_dict(d)  for d in logs],
            "waypoints":  self._build_waypoints(
                origin_lat, origin_lon, pickup_lat, pickup_lon,
                dropoff_lat, dropoff_lon, stops),
        }

    # ── helpers ─────────────────────────────────────────────────────────────
    def _haversine(self, lat1, lon1, lat2, lon2) -> float:
        R = 3958.8
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        a = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
        return R * 2 * math.asin(math.sqrt(a))

    def _stop_dict(self, s: TripStop) -> dict:
        return {
            "name": s.name, "stop_type": s.stop_type,
            "location": s.location, "lat": s.lat, "lon": s.lon,
            "duration_hours": round(s.duration_hours, 2),
            "status": s.status.value,
            "cumulative_miles": round(s.cumulative_miles, 1),
            "day": s.day + 1,
            "hour_in_day": round(s.hour_in_day % 24, 2),
        }

    def _log_dict(self, d: DayLog) -> dict:
        return {
            "day_number":   d.day_number,
            "date_label":   d.date_label,
            "total_driving": round(d.total_driving, 2),
            "total_on_duty": round(d.total_on_duty, 2),
            "total_off_duty": round(d.total_off_duty, 2),
            "odometer_start": round(d.odometer_start),
            "odometer_end":   round(d.odometer_end),
            "entries": [self._entry_dict(e) for e in d.entries],
        }

    def _entry_dict(self, e: LogEntry) -> dict:
        return {
            "status": e.status.value,
            "duration_hours": round(e.duration_hours, 4),
            "label": e.label,
            "location": e.location,
            "start_hour": round(e.start_hour % 24, 4),
            "day": e.day,
            "miles": round(e.miles, 1),
        }

    def _build_waypoints(self, olat, olon, plat, plon, dlat, dlon, stops) -> list:
        pts = [
            {"lat": olat, "lon": olon, "type": "origin"},
            {"lat": plat, "lon": plon, "type": "pickup"},
            {"lat": dlat, "lon": dlon, "type": "dropoff"},
        ]
        for s in stops:
            if s.lat != 0 and s.stop_type in ("fuel", "rest", "restart"):
                pts.append({"lat": s.lat, "lon": s.lon, "type": s.stop_type, "name": s.name})
        return pts
