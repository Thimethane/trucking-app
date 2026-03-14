import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Chip } from '@mui/material';

const STOP_COLORS = {
  pickup:'#0ea5e9', dropoff:'#f97316', fuel:'#22c55e', rest:'#a855f7', restart:'#f59e0b', origin:'#22c55e',
};
const STOP_EMOJIS = { pickup:'📦', dropoff:'🏁', fuel:'⛽', rest:'🛌', restart:'🔄', origin:'📍' };
const STOP_LABELS = {
  pickup:'Pickup', dropoff:'Drop-off', fuel:'Fuel Stop', rest:'Rest Break', restart:'34-Hr Restart', origin:'Origin',
};

export default function RouteMap({ locations, stops }) {
  const mapRef       = useRef(null);
  const mapInstance  = useRef(null);
  const [mapReady, setMapReady]   = useState(false);
  const [mapError, setMapError]   = useState(null);
  const [routeKm,  setRouteKm]    = useState(null);

  // Key changes whenever locations change — forces full remount
  const tripKey = locations
    ? `${locations.origin.lat},${locations.origin.lon}|${locations.dropoff.lat},${locations.dropoff.lon}`
    : null;

  useEffect(() => {
    if (!locations || !mapRef.current) return;

    // Tear down any existing instance
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }
    setMapReady(false);
    setMapError(null);
    setRouteKm(null);

    const init = async () => {
      try {
        const L = (await import('leaflet')).default;

        // Fix default icon paths
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const map = L.map(mapRef.current, {
          center: [
            (locations.origin.lat + locations.dropoff.lat) / 2,
            (locations.origin.lon + locations.dropoff.lon) / 2,
          ],
          zoom: 5, zoomControl: true, attributionControl: true,
        });
        mapInstance.current = map;

        // Dark CartoDB tiles — free, no API key
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd', maxZoom: 19,
        }).addTo(map);

        // ── OSRM road routing ────────────────────────────────────────────────
        let routePoints = null;
        try {
          const coords = [
            `${locations.origin.lon},${locations.origin.lat}`,
            `${locations.pickup.lon},${locations.pickup.lat}`,
            `${locations.dropoff.lon},${locations.dropoff.lat}`,
          ].join(';');
          const res  = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
            { signal: AbortSignal.timeout(7000) }
          );
          const data = await res.json();
          if (data?.routes?.[0]?.geometry?.coordinates) {
            routePoints = data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
            const distKm = Math.round(data.routes[0].distance / 1000);
            setRouteKm(distKm);
          }
        } catch (_) { /* fall through to straight-line */ }

        if (!routePoints) {
          routePoints = [
            [locations.origin.lat,  locations.origin.lon],
            [locations.pickup.lat,  locations.pickup.lon],
            [locations.dropoff.lat, locations.dropoff.lon],
          ];
        }

        // Glow polyline (dark base + orange dash)
        L.polyline(routePoints, { color:'#1e3a5f', weight:7,   opacity:1 }).addTo(map);
        L.polyline(routePoints, { color:'#f97316', weight:2.5, opacity:0.9, dashArray:'10,5' }).addTo(map);

        // ── Marker factory ───────────────────────────────────────────────────
        const makeIcon = (emoji, color, size=34) => L.divIcon({
          html: `<div style="
            background:${color};border-radius:50%;width:${size}px;height:${size}px;
            display:flex;align-items:center;justify-content:center;
            border:2.5px solid rgba(255,255,255,0.9);
            box-shadow:0 2px 12px rgba(0,0,0,0.6),0 0 0 4px ${color}30;
            font-size:${Math.round(size*0.44)}px;
          ">${emoji}</div>`,
          iconSize:[size,size], iconAnchor:[size/2,size/2], className:'',
        });

        const popup = (type, name, color, sub) => `
          <div style="font-family:'IBM Plex Mono',monospace;min-width:160px">
            <div style="color:${color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">${type}</div>
            <div style="color:#f1f5f9;font-size:12px;margin-bottom:4px">${name}</div>
            <div style="color:#475569;font-size:10px">${sub}</div>
          </div>`;

        // Origin
        L.marker([locations.origin.lat, locations.origin.lon], { icon:makeIcon('📍','#22c55e',38) })
          .addTo(map)
          .bindPopup(popup('Origin', locations.origin.name, '#22c55e', 'Departure point'));

        // Mandatory stops
        stops?.forEach(s => {
          if (!s.lat || !s.lon || (s.lat === 0 && s.lon === 0)) return;
          const color = STOP_COLORS[s.stop_type] || '#64748b';
          L.marker([s.lat, s.lon], { icon: makeIcon(STOP_EMOJIS[s.stop_type]||'📍', color) })
            .addTo(map)
            .bindPopup(popup(
              STOP_LABELS[s.stop_type] || s.stop_type,
              s.name, color,
              `Day ${s.day} · ${s.duration_hours}h · Mile ${s.cumulative_miles}`
            ));
        });

        // Fit bounds with padding
        const allPts = [
          [locations.origin.lat,  locations.origin.lon],
          [locations.pickup.lat,  locations.pickup.lon],
          [locations.dropoff.lat, locations.dropoff.lon],
          ...(stops || []).filter(s => s.lat && s.lon).map(s => [s.lat, s.lon]),
        ];
        map.fitBounds(L.latLngBounds(allPts).pad(0.14));
        setMapReady(true);
      } catch (err) {
        setMapError('Map failed to load: ' + err.message);
      }
    };

    init();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripKey]);

  const restStops  = stops?.filter(s => s.stop_type === 'rest' || s.stop_type === 'restart').length || 0;
  const fuelStops  = stops?.filter(s => s.stop_type === 'fuel').length || 0;

  return (
    <Paper sx={{ overflow:'hidden', background:'#0d1526', border:'1px solid #0f2040' }}>
      {/* Toolbar */}
      <Box sx={{
        px:2, py:1.5, borderBottom:'1px solid #0f2040', background:'#070d1a',
        display:'flex', alignItems:'center', gap:1.5, flexWrap:'wrap',
      }}>
        <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:10, color:'#475569', letterSpacing:'0.08em' }}>
          ROUTE MAP
        </Typography>
        {routeKm && (
          <Chip label={`${routeKm.toLocaleString()} km road distance`} size="small" sx={{
            background:'#f9731615', color:'#f97316', border:'1px solid #f9731630',
            fontFamily:'"IBM Plex Mono"', fontSize:9,
          }} />
        )}
        <Chip label={`${fuelStops} fuel`} size="small" sx={{
          background:'#22c55e12', color:'#22c55e', border:'1px solid #22c55e25',
          fontFamily:'"IBM Plex Mono"', fontSize:9,
        }} />
        <Chip label={`${restStops} rest`} size="small" sx={{
          background:'#a855f712', color:'#a855f7', border:'1px solid #a855f725',
          fontFamily:'"IBM Plex Mono"', fontSize:9,
        }} />
        <Typography sx={{ ml:'auto', fontFamily:'"IBM Plex Mono"', fontSize:8, color:'#1e3a5f' }}>
          © OpenStreetMap + CARTO · OSRM routing
        </Typography>
        <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
          {Object.entries(STOP_LABELS).filter(([t]) => t !== 'origin').map(([type, label]) => (
            <Box key={type} sx={{ display:'flex', alignItems:'center', gap:0.4 }}>
              <Box sx={{ fontSize:10 }}>{STOP_EMOJIS[type]}</Box>
              <Typography sx={{ fontSize:8, color:STOP_COLORS[type], fontFamily:'"IBM Plex Mono"' }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Map container */}
      <Box sx={{ position:'relative', height:480 }}>
        {!mapReady && !mapError && (
          <Box sx={{
            position:'absolute', inset:0, zIndex:10, background:'#070d1a',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Box sx={{ textAlign:'center' }}>
              <CircularProgress size={32} sx={{ color:'#f97316', mb:2 }} />
              <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:11, color:'#334155' }}>
                Fetching road routing…
              </Typography>
            </Box>
          </Box>
        )}
        {mapError && (
          <Box sx={{ p:4, textAlign:'center', color:'#ef4444', fontFamily:'"IBM Plex Mono"', fontSize:12 }}>
            {mapError}
          </Box>
        )}
        <Box
          ref={mapRef}
          sx={{
            height:'100%', width:'100%',
            '& .leaflet-container':{ background:'#0a1628 !important', fontFamily:'"IBM Plex Mono"' },
            '& .leaflet-popup-content-wrapper':{
              background:'#0d1526', border:'1px solid #1e293b', color:'#f1f5f9',
              borderRadius:'6px', boxShadow:'0 8px 32px rgba(0,0,0,0.6)',
            },
            '& .leaflet-popup-tip':{ background:'#0d1526' },
            '& .leaflet-control-zoom a':{
              background:'#0d1526 !important', color:'#94a3b8 !important', border:'1px solid #1e293b !important',
            },
          }}
        />
      </Box>
    </Paper>
  );
}
