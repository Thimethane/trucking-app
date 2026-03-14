/**
 * TruckLogger HOS — API Service Layer
 * Centralises all backend communication.
 */
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: BASE,
  timeout: 30000,               // 30s — geocoding + HOS calc can be slow
  headers: { 'Content-Type': 'application/json' },
});

// ── Request logging (dev only) ────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  client.interceptors.request.use((config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  });
  client.interceptors.response.use(
    (res) => { console.log(`[API] ← ${res.status}`, res.data?.summary || ''); return res; },
    (err) => { console.error('[API] ✗', err.response?.data || err.message); return Promise.reject(err); }
  );
}

// ── Error normaliser ──────────────────────────────────────────────────────────
function apiError(err) {
  if (err.response?.data?.error) return new Error(err.response.data.error);
  if (err.code === 'ECONNABORTED')  return new Error(`Request timed out. The server at ${BASE} may be starting up — try again in 30 seconds.`);
  if (err.code === 'ERR_NETWORK')   return new Error(`Cannot reach backend at ${BASE}. Make sure the Django server is running.`);
  return new Error(err.message || 'Unknown server error');
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Plan a full HOS-compliant trip.
 * @param {{ origin: string, pickup: string, dropoff: string, current_cycle_used: number }} params
 * @returns {Promise<TripResult>}
 */
export async function planTrip(params) {
  try {
    const { data } = await client.post('/api/trips/plan/', params);
    return data;
  } catch (err) {
    throw apiError(err);
  }
}

/**
 * Autocomplete a location string.
 * @param {string} q  Partial location text
 * @returns {Promise<Array<{ name: string, short: string, lat: number, lon: number }>>}
 */
export async function geocodeSuggest(q) {
  try {
    const { data } = await client.get('/api/trips/geocode/', { params: { q } });
    return data.suggestions || [];
  } catch {
    return [];
  }
}

export default client;
