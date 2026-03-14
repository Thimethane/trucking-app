"""
Unit tests for the HOS Compliance Engine.
Run: python manage.py test trips
"""
from django.test import TestCase
from .compliance_engine import HOSComplianceEngine


class HOSEngineTest(TestCase):

    def _run(self, origin, olat, olon, pickup, plat, plon, dropoff, dlat, dlon, cycle=0):
        e = HOSComplianceEngine()
        return e.calculate_trip(origin, olat, olon, pickup, plat, plon, dropoff, dlat, dlon, cycle)

    # ── Short trips ──────────────────────────────────────────────────────────

    def test_short_trip_single_day(self):
        """Chicago → Indy → Cincinnati should complete in 1-2 days."""
        r = self._run('Chicago, IL', 41.878, -87.629,
                      'Indianapolis, IN', 39.768, -86.158,
                      'Cincinnati, OH', 39.103, -84.512)
        self.assertLessEqual(r['summary']['total_days'], 2)
        self.assertGreater(r['summary']['total_miles'], 200)

    def test_all_days_have_entries(self):
        """Every day log must contain at least one entry."""
        r = self._run('Los Angeles, CA', 34.052, -118.243,
                      'Phoenix, AZ', 33.448, -112.074,
                      'Dallas, TX', 32.776, -96.796)
        for day in r['daily_logs']:
            self.assertGreater(len(day['entries']), 0,
                               f"Day {day['day_number']} has no entries")

    # ── 11-Hour driving limit ─────────────────────────────────────────────────

    def test_no_day_exceeds_11h_driving(self):
        """No single day log should show > 11h of driving."""
        r = self._run('New York, NY', 40.712, -74.005,
                      'Chicago, IL', 41.878, -87.629,
                      'Los Angeles, CA', 34.052, -118.243)
        for day in r['daily_logs']:
            self.assertLessEqual(
                day['total_driving'], 11.05,
                f"Day {day['day_number']} has {day['total_driving']:.2f}h driving (>11h limit)"
            )

    # ── Multi-day ─────────────────────────────────────────────────────────────

    def test_cross_country_is_multi_day(self):
        """NY → LA (2,790 mi) must span multiple days."""
        r = self._run('New York, NY', 40.712, -74.005,
                      'Chicago, IL', 41.878, -87.629,
                      'Los Angeles, CA', 34.052, -118.243)
        self.assertGreater(r['summary']['total_days'], 1)

    def test_multi_day_odometers_are_sequential(self):
        """Each day's odometer_end must be >= odometer_start."""
        r = self._run('New York, NY', 40.712, -74.005,
                      'Chicago, IL', 41.878, -87.629,
                      'Los Angeles, CA', 34.052, -118.243)
        prev_end = 0
        for day in r['daily_logs']:
            self.assertGreaterEqual(day['odometer_end'], day['odometer_start'],
                                    f"Day {day['day_number']}: end < start")
            self.assertGreaterEqual(day['odometer_start'], prev_end - 1,
                                    f"Day {day['day_number']}: start < prev end")
            prev_end = day['odometer_end']

    # ── Fuel stops ────────────────────────────────────────────────────────────

    def test_fuel_stop_over_1000_miles(self):
        """Trip over 1,000 miles must include at least one fuel stop."""
        r = self._run('Los Angeles, CA', 34.052, -118.243,
                      'Albuquerque, NM', 35.084, -106.651,
                      'Dallas, TX', 32.776, -96.796)
        self.assertGreater(r['summary']['total_miles'], 1000)
        self.assertGreater(r['summary']['fuel_stops'], 0)

    def test_no_fuel_stop_under_1000_miles(self):
        """Short trip under 1,000 miles should have zero fuel stops."""
        r = self._run('Chicago, IL', 41.878, -87.629,
                      'Indianapolis, IN', 39.768, -86.158,
                      'Cincinnati, OH', 39.103, -84.512)
        self.assertLess(r['summary']['total_miles'], 1000)
        self.assertEqual(r['summary']['fuel_stops'], 0)

    # ── 70-hr cycle ───────────────────────────────────────────────────────────

    def test_high_cycle_triggers_restart(self):
        """Driver at 68h used should trigger a 34-hr restart on a long trip."""
        r = self._run('Seattle, WA', 47.606, -122.332,
                      'Portland, OR', 45.523, -122.676,
                      'San Francisco, CA', 37.774, -122.419,
                      cycle=68)
        stop_types = [s['stop_type'] for s in r['stops']]
        # Should have a restart stop since cycle is nearly maxed
        self.assertIn('restart', stop_types,
                      "Expected a 34-hr restart stop for driver near 70h cycle")

    # ── Stops present ────────────────────────────────────────────────────────

    def test_pickup_and_dropoff_stops_always_present(self):
        """Every trip must include exactly one pickup and one dropoff stop."""
        r = self._run('Miami, FL', 25.761, -80.191,
                      'Atlanta, GA', 33.748, -84.387,
                      'Charlotte, NC', 35.227, -80.843)
        stop_types = [s['stop_type'] for s in r['stops']]
        self.assertEqual(stop_types.count('pickup'), 1)
        self.assertEqual(stop_types.count('dropoff'), 1)

    # ── Log images ────────────────────────────────────────────────────────────

    def test_log_images_generated(self):
        """Log sheet images must be generated for every day."""
        from .log_generator import generate_all_logs
        r = self._run('Chicago, IL', 41.878, -87.629,
                      'Indianapolis, IN', 39.768, -86.158,
                      'Nashville, TN', 36.174, -86.767)
        images = generate_all_logs(r['daily_logs'])
        self.assertEqual(len(images), len(r['daily_logs']))
        for img in images:
            self.assertGreater(len(img), 1000, "Base64 PNG too small — likely empty")

    # ── Entry start hours ─────────────────────────────────────────────────────

    def test_entry_start_hours_in_range(self):
        """All log entry start_hour values must be between 0 and 24."""
        r = self._run('New York, NY', 40.712, -74.005,
                      'Chicago, IL', 41.878, -87.629,
                      'Los Angeles, CA', 34.052, -118.243)
        for day in r['daily_logs']:
            for entry in day['entries']:
                self.assertGreaterEqual(entry['start_hour'], 0.0,
                    f"Negative start_hour in day {day['day_number']}: {entry}")
                self.assertLessEqual(entry['start_hour'], 24.0,
                    f"start_hour > 24 in day {day['day_number']}: {entry}")
